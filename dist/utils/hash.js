"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const hashPassword = async (password) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
    return hashedPassword;
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    const isMatch = await bcrypt_1.default.compare(password, hashedPassword);
    return isMatch;
};
exports.comparePassword = comparePassword;
//# sourceMappingURL=hash.js.map