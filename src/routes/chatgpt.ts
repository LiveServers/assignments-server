import express from "express";
import fetchChatGptResponse,{unauthenticatedChatGptApiCall} from "../controllers/chatgpt";
import isAuth from "../auth";

const router = express.Router();

router.post("/fetch-response", isAuth, fetchChatGptResponse);
router.post("/unauthenticated/fetch-response", unauthenticatedChatGptApiCall);

export default router;