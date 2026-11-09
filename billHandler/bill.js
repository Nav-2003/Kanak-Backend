import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import Bill from '../DB/billDetail.js'

const router = Router()

function makeBillNumber() {
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17)
  const suffix = randomBytes(2).toString('hex').toUpperCase()
  return `KE-${timestamp}-${suffix}`
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Create a bill
router.post('/', async (req, res) => {
  try {
    const {
      customer = {},
      items,
      discount = 0,
      discountPercent,
      paymentReceived = 0,
    } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Add at least one item to the bill.' })
    }

    const billItems = items.map((item) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)

      if (!item.productName?.trim()) {
        throw new Error('Every bill item needs a product name.')
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Item quantity must be a whole number greater than zero.')
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Item price must be zero or greater.')
      }

      return {
        productId: item.isManual ? null : item.productId || null,
        isManual: Boolean(item.isManual),
        productName: item.productName.trim(),
        productDetail: item.productDetail?.trim() || '',
        manufacturerName: item.manufacturerName?.trim() || '',
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      }
    })

    const subtotal = billItems.reduce((sum, item) => sum + item.lineTotal, 0)

    // Accept either a rupee discount or a percentage.
    let safeDiscount

    if (discountPercent !== undefined) {
      const percent = Number(discountPercent)

      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return res.status(400).json({
          message: 'Discount percentage must be between 0 and 100.',
        })
      }

      safeDiscount = (subtotal * percent) / 100
    } else {
      safeDiscount = Number(discount)
    }

    if (!Number.isFinite(safeDiscount) || safeDiscount < 0 || safeDiscount > subtotal) {
      return res.status(400).json({
        message: 'Discount must be between zero and the subtotal.',
      })
    }

    const total = subtotal - safeDiscount
    const received = Number(paymentReceived)

    if (!Number.isFinite(received) || received < 0 || received > total) {
      return res.status(400).json({
        message: 'Payment received must be between zero and the bill total.',
      })
    }

    const bill = await Bill.create({
      billNumber: makeBillNumber(),
      customer: {
        name: customer.name?.trim() || 'Walk-in customer',
        phone: customer.phone?.trim() || '',
      },
      items: billItems,
      subtotal,
      discount: safeDiscount,
      total,
      paymentReceived: received,
      paymentPending: total - received,
    })

    return res.status(201).json({ message: 'Bill created.', bill })
  } catch (error) {
    if (
      error.name === 'ValidationError' ||
      error.message?.startsWith('Every bill item') ||
      error.message?.startsWith('Item quantity') ||
      error.message?.startsWith('Item price')
    ) {
      return res.status(400).json({ message: error.message })
    }

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Bill number already exists. Please retry.' })
    }

    console.error('Create bill error:', error)
    return res.status(500).json({ message: 'Could not create the bill.' })
  }
})

// Fetch bills.
// Optional query: ?search=customer-or-phone-or-bill-number&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100)
    const search = String(req.query.search || '').trim()

    const filter = search
      ? {
          $or: [
            { billNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { 'customer.name': { $regex: escapeRegex(search), $options: 'i' } },
            { 'customer.phone': { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {}

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bill.countDocuments(filter),
    ])

    return res.json({ bills, page, limit, total })
  } catch (error) {
    console.error('Fetch bills error:', error)
    return res.status(500).json({ message: 'Could not fetch bills.' })
  }
})

// Fetch one bill by its printed bill number
router.get('/:billNumber', async (req, res) => {
  try {
    const bill = await Bill.findOne({
      billNumber: req.params.billNumber,
    }).lean()

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' })
    }

    return res.json({ bill })
  } catch (error) {
    console.error('Fetch bill error:', error)
    return res.status(500).json({ message: 'Could not fetch the bill.' })
  }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedProduct = await Bill.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Bill not found" });
        }

        return res.status(200).json({
            message: "Bill deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

router.put('/update/bill/:id', async (req, res) => {
  try {
    const amount = Number(req.body.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: 'Payment amount must be greater than zero.',
      })
    }

    const bill = await Bill.findOneAndUpdate(
      {
        _id: req.params.id,
        paymentPending: { $gte: amount },
      },
      {
        $inc: {
          paymentReceived: amount,
          paymentPending: -amount,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (bill) {
      return res.status(200).json({
        message: 'Payment recorded successfully.',
        bill,
      })
    }

    const existingBill = await Bill.findById(req.params.id)
      .select('paymentPending')

    if (!existingBill) {
      return res.status(404).json({ message: 'Bill not found.' })
    }

    return res.status(400).json({
      message: `Payment exceeds the pending balance of ${existingBill.paymentPending}.`,
      bill: existingBill,
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid bill ID.' })
    }

    console.error('Record payment error:', error)
    return res.status(500).json({ message: 'Could not record the payment.' })
  }
})



export default router