const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    invitedTo:  [{
            type: Schema.Types.ObjectId,
            ref: 'League'
        }],
    leagues: [{
        type: Schema.Types.ObjectId,
        ref: 'League'
    }],
    teams:[{
        leagueid: {
            type: Schema.Types.ObjectId,
            ref: 'League'
        },
        team: [String]
    }]
    /*leaguesDraftTime: [{
        leagueid: {
            type: Schema.Types.ObjectId,
            ref: 'League'
        },
        yourDraftTime: {
            type: Date
        }   
    }]*/
});
//adds password, and username field
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);