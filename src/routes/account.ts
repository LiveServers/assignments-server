import express from "express";
import accountControllers from "../controllers/account";
import isAuth from "../auth";

const router = express.Router();

router.post("/sign-in", accountControllers.signIn);

router.post("/create-account", accountControllers.createAccount);

router.put("/update-account", isAuth, accountControllers.updateAccountDetails);

router.get("/account-details", isAuth, accountControllers.fetchAccountDetails);

router.post("/log-out", isAuth, accountControllers.logOutUser);

export default router;