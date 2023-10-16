import express from "express";
import MpesaTransactions from "../controllers/mpesa";
import isAuth from "../auth";

const router = express.Router();

router.post("/process-payment", isAuth, new MpesaTransactions().processMpesaRequest);
router.post("/hooks/lnmResponse", new MpesaTransactions().lnmResponse);

export default router;