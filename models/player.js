const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerSchema = new Schema({
    name: {
        type: String
    },
    pointsInLastGame: {
        type: Number,
        default: 0
    },
    assistsInLastGame: {
        type: Number,
        default: 0
    },
    reboundsInLastGame: {
        type: Number,
        default: 0
    },
    stealsInLastGame: {
        type: Number,
        default: 0
    },
    blocksInLastGame: {
        type: Number,
        default: 0
    },
});

module.exports = mongoose.model('Player', PlayerSchema);