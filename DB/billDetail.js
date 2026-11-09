import mongoose from 'mongoose'

const { Schema } = mongoose

const billItemSchema = new Schema(
  {
    // Null for products entered manually on the bill.
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    isManual: {
      type: Boolean,
      default: false,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productDetail: {
      type: String,
      default: '',
      trim: true,
    },
    manufacturerName: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
)

const shopSnapshotSchema = new Schema(
  {
    name: {
      type: String,
      default: 'Kanak Electronics & Electrical Shop',
    },
    owner: {
      type: String,
      default: 'Jitendra Kushwaha',
    },
    address: {
      type: String,
      default: 'Jari Bazar, Karchhana Road, Prayagraj',
    },
    phoneNumbers: {
      type: [String],
      default: ['9793752827', '75110061563'],
    },
    gstin: {
      type: String,
      default: '09CSFPK4607N1ZB',
    },
  },
  { _id: false },
)

const billSchema = new Schema(
  {
    // Example: KE-20261108140530123
    billNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customer: {
      name: {
        type: String,
        default: 'Walk-in customer',
        trim: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
    },
    items: {
      type: [billItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'A bill must contain at least one item.',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReceived: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paymentPending: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shopSnapshot: {
      type: shopSnapshotSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
)

billSchema.pre('validate', function () {
  if (this.paymentReceived > this.total) {
    this.invalidate(
      'paymentReceived',
      'Payment received cannot exceed the bill total.',
    )
  }

  this.paymentPending = Math.max(this.total - this.paymentReceived, 0)
})

billSchema.index({ 'customer.name': 1 })
billSchema.index({ 'customer.phone': 1 })
billSchema.index({ createdAt: -1 })

const Bill = mongoose.models.Bill || mongoose.model('Bill', billSchema)

export default Bill