const mongoose = require('mongoose');
const RestaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please add a name'],
        unique: true,
        trim:true ,
        maxlength:[50,'Name can not be more than 50 characters']
    },
    address:{
        type: String,
        required: [true, 'Please add an address']
    },
    tel:{
        type: String,
        required: [true, 'Please add a telephone number']
    },
    openCloseTime: {
        type: String,
        required: [true, 'Please add open-close time']
    }
},{
    timestamps: true,
    toJSON: {virtuals:true},
    toObject: {virtuals:true}
});

//Reverse populate with virtuals
RestaurantSchema.virtual('reservations', {
  ref: 'Reservation',
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false
});


module.exports=mongoose.model('Restaurant',RestaurantSchema);
    
    