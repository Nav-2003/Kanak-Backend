import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import ProductHandler from "./ProductHandler/fiud.js"
import billHandler from "./billHandler/bill.js"


const app = express();

app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173"
}));


mongoose.connect('mongodb+srv://yashi:naveen%402003@cluster0.vrbuumh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.log("MongoDB Connection Error:", err));

app.use("/api/product",ProductHandler);
app.use("/api/bill",billHandler)


app.listen(3000, () => {
    console.log("Server running on port 3000");
});



