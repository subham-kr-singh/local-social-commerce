export {};

declare global {
  namespace Express {
    interface Request {
      /** Raw JSON string for Razorpay webhook signature verification */
      rawBody?: string;
    }
  }
}
