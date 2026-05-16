import { Router } from "express";
import { getAccountDetails } from "../controllers/meController.js";

const router = Router();

router.get('/', getAccountDetails);

export default router;