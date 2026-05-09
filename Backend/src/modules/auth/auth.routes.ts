import { Router }               from "express";
import { validate }             from "../../shared/middleware/validate.middleware.js";
import { requireUser, requireSeller } from "./auth.middleware.js";
import {
  registerUserSchema,
  registerSellerSchema,
  loginSchema,
} from "./auth.types.js";
import {
  registerUserController,
  loginUserController,
  refreshUserTokenController,
  logoutUserController,
  getMeUserController,
  registerSellerController,
  loginSellerController,
  refreshSellerTokenController,
  logoutSellerController,
  getMeSellerController,
} from "./auth.controller.js";

const router = Router();

// ────────────────────────────────────────────────────────────────────────────
//  USER AUTH ROUTES
// ────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/auth/user/register:
 *   post:
 *     tags: [User Auth]
 *     summary: Register a new buyer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUserBody'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/SafeUser'
 *             example:
 *               success: true
 *               statusCode: 201
 *               message: Registration successful
 *               data:
 *                 user:
 *                   id: clxyz123abc
 *                   email: user@example.com
 *                   username: john_doe
 *                   fullName: John Doe
 *                   avatar: null
 *                   isVerified: false
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
router.post("/user/register", validate(registerUserSchema), registerUserController);

/**
 * @openapi
 * /api/v1/auth/user/login:
 *   post:
 *     tags: [User Auth]
 *     summary: Login with email and password
 *     description: >
 *       Returns an access token in the response body and sets a `refreshToken`
 *       httpOnly cookie. Store the access token in memory — never in localStorage.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly refresh token cookie (7-day expiry)
 *             schema:
 *               type: string
 *               example: refreshToken=eyJhbGci...; Path=/; HttpOnly; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/SafeUser'
 *                         accessToken:
 *                           type: string
 *                           example: eyJhbGci...
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Invalid email or password
 *               errors: []
 *       403:
 *         description: Account is deactivated
 */
router.post("/user/login", validate(loginSchema), loginUserController);

/**
 * @openapi
 * /api/v1/auth/user/refresh:
 *   post:
 *     tags: [User Auth]
 *     summary: Obtain a new access token using the refresh token cookie
 *     description: >
 *       Reads the `refreshToken` httpOnly cookie. Issues a new access token and
 *       rotates the refresh token (old one is invalidated). Send this request
 *       automatically when you receive a 401 on any protected endpoint.
 *     responses:
 *       200:
 *         description: Token refreshed
 *         headers:
 *           Set-Cookie:
 *             description: New rotated refresh token cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AccessToken'
 *       401:
 *         description: Missing, expired, or already-used refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/user/refresh", refreshUserTokenController);

/**
 * @openapi
 * /api/v1/auth/user/logout:
 *   post:
 *     tags: [User Auth]
 *     summary: Logout and revoke the refresh token
 *     description: >
 *       Deletes the refresh token from the database and clears the cookie.
 *       Always returns 200 — even if the cookie is already gone.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: Logged out successfully
 *               data: null
 */
router.post("/user/logout", logoutUserController);

/**
 * @openapi
 * /api/v1/auth/user/me:
 *   get:
 *     tags: [User Auth]
 *     summary: Get the currently authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/SafeUser'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 */
router.get("/user/me", requireUser, getMeUserController);

// ────────────────────────────────────────────────────────────────────────────
//  SELLER AUTH ROUTES
// ────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/auth/seller/register:
 *   post:
 *     tags: [Seller Auth]
 *     summary: Register a new seller / business account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSellerBody'
 *     responses:
 *       201:
 *         description: Seller registration successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         seller:
 *                           $ref: '#/components/schemas/SafeSeller'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
router.post("/seller/register", validate(registerSellerSchema), registerSellerController);

/**
 * @openapi
 * /api/v1/auth/seller/login:
 *   post:
 *     tags: [Seller Auth]
 *     summary: Login as a seller
 *     description: >
 *       Returns an access token (role = "seller") and sets an httpOnly refresh
 *       token cookie. The access token is role-locked — it cannot be used on
 *       user-only endpoints and vice versa.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly refresh token cookie (7-day expiry)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         seller:
 *                           $ref: '#/components/schemas/SafeSeller'
 *                         accessToken:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is deactivated
 */
router.post("/seller/login", validate(loginSchema), loginSellerController);

/**
 * @openapi
 * /api/v1/auth/seller/refresh:
 *   post:
 *     tags: [Seller Auth]
 *     summary: Rotate the seller refresh token and get a new access token
 *     description: >
 *       Reads the `refreshToken` httpOnly cookie. Validates role = "seller".
 *       Rotates the token — the old one is immediately invalidated in the database.
 *     responses:
 *       200:
 *         description: Token refreshed
 *         headers:
 *           Set-Cookie:
 *             description: New rotated refresh token cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AccessToken'
 *       401:
 *         description: Missing, expired, already-used, or wrong-role refresh token
 */
router.post("/seller/refresh", refreshSellerTokenController);

/**
 * @openapi
 * /api/v1/auth/seller/logout:
 *   post:
 *     tags: [Seller Auth]
 *     summary: Logout seller and revoke refresh token
 *     description: Deletes the refresh token from DB and clears the cookie. Always returns 200.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: Logged out successfully
 *               data: null
 */
router.post("/seller/logout", logoutSellerController);

/**
 * @openapi
 * /api/v1/auth/seller/me:
 *   get:
 *     tags: [Seller Auth]
 *     summary: Get the currently authenticated seller's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Seller profile returned
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         seller:
 *                           $ref: '#/components/schemas/SafeSeller'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Token belongs to a user account, not a seller
 *       404:
 *         description: Seller not found
 */
router.get("/seller/me", requireSeller, getMeSellerController);

export default router;
