const app = require('../app');

// Export the Express app as a serverless function handler
module.exports = (req, res) => {
    return app(req, res);
};
