import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        Product_Name: {
            type: String,
            required: true,
            trim: true
        },

        Product_Detail: {
            type: String,
            default: "",
            trim: true
        },

        Manufacture_name: {
            type: String,
            default: "",
            trim: true
        },

        Quantity: {
            type: Number,
            required: true,
            min: 0
        },

        Price_per_item: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model("Product", productSchema);

export default Product;



