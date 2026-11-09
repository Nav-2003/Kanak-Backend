import express from "express";
import Product from "../DB/productDetail.js";

const router = express.Router();

router.get('/fetch', async (req, res) => {
    try {
        const products = await Product.find();
        return res.status(200).json(products);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


router.post('/insert', async (req, res) => {
    try {
        const {
            Product_Name,
            Product_Detail,
            Manufacture_name,
            Quantity,
            Price_per_item
        } = req.body;

        const product = await Product.create({
            Product_Name,
            Product_Detail,
            Manufacture_name,
            Quantity,
            Price_per_item
        });

        return res.status(201).json({
            message: "Product added successfully",
            product
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


router.put('/edit/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});


router.delete('/delete/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({
            message: "Product deleted successfully"
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

export default router;