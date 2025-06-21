"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTokenExpired = exports.generateResetToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateResetToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateResetToken = generateResetToken;
const isTokenExpired = (expiryDate) => {
    if (!expiryDate)
        return true;
    return expiryDate.getTime() < Date.now();
};
exports.isTokenExpired = isTokenExpired;
//# sourceMappingURL=tokens.js.map