"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = void 0;
const handleError = (error, res) => {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
};
exports.handleError = handleError;
//# sourceMappingURL=errorHandler.js.map