const Joi = require('joi');

module.exports.leagueSchema = Joi.object({
    league: Joi.object({
        leagueName: Joi.string().required(),
        leagueType: Joi.string().required(),
        draftTime: Joi.string().required(),
        maxPlayerCount: Joi.number().required().min(6).max(16),
    }).required()
});