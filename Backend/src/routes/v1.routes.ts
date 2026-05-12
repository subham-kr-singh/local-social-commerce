import { Router } from "express";
import authRouter from "../modules/auth/auth.routes.js";
import productRouter from "../modules/product/product.routes.js";
import postRouter from "../modules/post/post.routes.js";
import livestreamRouter from "../modules/livestream/livestream.routes.js";
import orderRouter from "../modules/order/order.routes.js";
import followRouter from "../modules/follow/follow.routes.js";
import sellersRouter from "../modules/sellers/sellers.routes.js";
import likeRouter from "../modules/like/like.routes.js";
import commentRouter from "../modules/comment/comment.routes.js";
import feedRouter from "../modules/feed/feed.routes.js";
import profileRouter from "../modules/profile/profile.routes.js";
import paymentRouter from "../modules/payment/payment.routes.js";

const v1 = Router();

v1.use("/auth", authRouter);
v1.use("/products", productRouter);
v1.use("/posts", postRouter);
v1.use("/livestreams", livestreamRouter);
v1.use("/orders", orderRouter);
v1.use("/follow", followRouter);
v1.use("/sellers", sellersRouter);
v1.use("/like", likeRouter);
v1.use("/comments", commentRouter);
v1.use("/feed", feedRouter);
v1.use("/profile", profileRouter);
v1.use("/payments", paymentRouter);

export default v1;
