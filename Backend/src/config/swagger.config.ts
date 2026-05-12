import swaggerJsdoc from "swagger-jsdoc";
import { env }      from "./env.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title:       "Local Social Commerce API",
      version:     "1.0.0",
      description: "REST API for the local social commerce platform — live-stream shopping, seller posts, and local marketplace.",
      contact: {
        name:  "Dev Team",
        email: "dev@socialcommerce.local",
      },
    },
    servers: [
      {
        url:         `http://localhost:${env.PORT}`,
        description: "Local development",
      },
      {
        url:         "https://api.socialcommerce.app",
        description: "Production",
      },
    ],

    // ── Security Scheme ──────────────────────────────────────────────────────
    components: {
      securitySchemes: {
        BearerAuth: {
          type:         "http",
          scheme:       "bearer",
          bearerFormat: "JWT",
          description:  "Access token obtained from /login. Expires in 15 minutes.",
        },
      },

      // ── Reusable Schemas ─────────────────────────────────────────────────
      schemas: {

        // ── Request Bodies ──────────────────────────────────────────────────
        RegisterUserBody: {
          type:     "object",
          required: ["email", "password", "username", "fullName"],
          properties: {
            email:    { type: "string", format: "email",   example: "user@example.com" },
            password: { type: "string", minLength: 8,      example: "secret123" },
            username: { type: "string", minLength: 3, maxLength: 20, pattern: "^\\w+$", example: "john_doe" },
            fullName: { type: "string", minLength: 2,      example: "John Doe" },
            phone:    { type: "string", pattern: "^\\d{10}$", example: "9876543210" },
            city:     { type: "string",                    example: "Indore" },
          },
        },

        RegisterSellerBody: {
          type:     "object",
          required: ["email", "password", "businessName", "ownerName", "phone", "category"],
          properties: {
            email:        { type: "string", format: "email", example: "shop@example.com" },
            password:     { type: "string", minLength: 8,    example: "secret123" },
            businessName: { type: "string",                  example: "Trendy Threads" },
            ownerName:    { type: "string",                  example: "Priya Sharma" },
            phone:        { type: "string", pattern: "^\\d{10}$", example: "9876543210" },
            category: {
              type: "string",
              enum: [
                "FASHION","ELECTRONICS","FOOD_BEVERAGE","HOME_DECOR",
                "BEAUTY_WELLNESS","SPORTS_FITNESS","BOOKS_STATIONERY",
                "TOYS_KIDS","JEWELLERY","OTHER",
              ],
              example: "FASHION",
            },
            city:    { type: "string", example: "Mumbai" },
            address: { type: "string", example: "12, MG Road" },
          },
        },

        LoginBody: {
          type:     "object",
          required: ["email", "password"],
          properties: {
            email:    { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string",                  example: "secret123" },
          },
        },

        // ── Response Objects ────────────────────────────────────────────────
        SafeUser: {
          type: "object",
          properties: {
            id:         { type: "string", example: "clxyz123abc" },
            email:      { type: "string", example: "user@example.com" },
            username:   { type: "string", example: "john_doe" },
            fullName:   { type: "string", example: "John Doe" },
            avatar:     { type: "string", nullable: true, example: null },
            bio:        { type: "string", nullable: true, example: null },
            phone:      { type: "string", nullable: true, example: "9876543210" },
            city:       { type: "string", nullable: true, example: "Indore" },
            isVerified: { type: "boolean", example: false },
            createdAt:  { type: "string", format: "date-time" },
          },
        },

        SafeSeller: {
          type: "object",
          properties: {
            id:           { type: "string",  example: "clxyz456def" },
            email:        { type: "string",  example: "shop@example.com" },
            businessName: { type: "string",  example: "Trendy Threads" },
            ownerName:    { type: "string",  example: "Priya Sharma" },
            logo:         { type: "string",  nullable: true, example: null },
            phone:        { type: "string",  example: "9876543210" },
            category:     { type: "string",  example: "FASHION" },
            city:         { type: "string",  nullable: true, example: "Mumbai" },
            isVerified:   { type: "boolean", example: false },
            rating:       { type: "number",  example: 0 },
            totalSales:   { type: "integer", example: 0 },
            createdAt:    { type: "string",  format: "date-time" },
          },
        },

        AccessToken: {
          type: "object",
          properties: {
            accessToken: { type: "string", description: "JWT access token. Expires in 15 min.", example: "eyJhbGci..." },
          },
        },

        // ── Generic Envelopes ───────────────────────────────────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            success:    { type: "boolean", example: true },
            statusCode: { type: "integer", example: 200 },
            message:    { type: "string",  example: "Operation successful" },
            data:       { type: "object" },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            success:    { type: "boolean", example: false },
            message:    { type: "string",  example: "Validation failed" },
            errors:     { type: "array",   items: { type: "object" } },
          },
        },

        ValidationError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string",  example: "Validation failed" },
            errors: {
              type: "object",
              example: { email: ["Invalid email"], password: ["Must be at least 8 characters"] },
            },
          },
        },
      },

      // ── Reusable Responses ───────────────────────────────────────────────
      responses: {
        UnauthorizedError: {
          description: "Access token missing or expired",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { success: false, message: "Token expired or invalid", errors: [] },
            },
          },
        },
        ValidationError: {
          description: "Request body failed Zod validation",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" },
            },
          },
        },
        ConflictError: {
          description: "Email or username already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { success: false, message: "Email is already registered", errors: [] },
            },
          },
        },
      },
    },

    // ── Tag Groups (shown as sections in the UI) ─────────────────────────────
    tags: [
      { name: "User Auth",   description: "Registration, login, token refresh, and profile for buyers" },
      { name: "Seller Auth", description: "Registration, login, token refresh, and profile for sellers" },
    ],
  },

  // swagger-jsdoc will scan these files for @openapi JSDoc blocks
  apis: ["./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
