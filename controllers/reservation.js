const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');

//@desc Get all Reservations
//@routeGET /api/v1/Reservations
//@access Privat
exports.getReservations = async(req,res,next)=>{
    let query;
    //General users can see only their Reservations!
    if(req.user.role !== 'admin'){
        query=Reservation.find({user:req.user.id}).populate({
            path:'restaurant',
            select: 'name province tel'
        });
    }else{ //If you are an admin, you can see all!
        if (req.params.hospitalId) {
            console.log(req.params.hospitalId);
            query = Reservation.find({hospital:req.params.hospitalId}).populate({
                path:"restaurant",
                select: "name province tel",
            });
        }else
        query=Reservation.find().populate({
            path:'restaurant',
            select: 'name province tel'
        });
    }
    try {
        const Reservations= await query;
        
        res.status (200).json({
            success:true,
            count: Reservations.length,
            data: Reservations
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Reservation"});
    }
};

//@desc Get single Reservation
//@route GET /api/v1/Reservations/:id
//@access Public
exports.getReservation=async(req,res,next)=>{
    try {
        const Reservation= await Reservation.findById(req.params.id).populate({
            path: 'restaurant',
            select: 'name description tel'
        });

        if(!Reservation){
            return res.status(404).json({success:false, message:` No Reservation with the id of ${req.params.id}`});
        }
        res.status(200).json({
            success:true,
            data: Reservation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Reservation"});
    }
};

//@desc Add Reservation
//@route POST /api/v1/hospitals/:hospitalId/Reservations
//@access Private
exports.addReservation=async (req,res,next)=>{
    try {
        req.body.hospital=req.params.hospitalId;
        const hospital= await Hospital.findById(req.params.hospitalId);        
        
        if(!hospital){
            return res.status(404).json({success:false,message:`No restaurant with the id of ${req.params.hospitalId}`});
        }
        //add user Id to req.body
        req.body.user=req.user.id;

        //Check for existed Reservation
        const existedReservations=await Reservation.find({user:req.user.id});
        
        //If the user is not an admin, they can only create 3 Reservation.
        if(existedReservations.length >= 3 && req.user.role !== 'admin'){
            return res.status(400).json({success:false,message:` The user with ID ${req.user.id} has already made 3 Reservations`});
        }

        const Reservation = await Reservation.create(req.body);
        res.status(200).json({
            success:true,
            data: Reservation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false,message:"Cannot create Reservation"});
    }
}

//@desc Update Reservation
//@route PUT /api/v1/Reservations/:id
//@access Private
exports.updateReservation=async (req,res, next)=>{
    try {
        let Reservation= await Reservation.findById(req.params.id);
        if(!Reservation){
            return res.status(404).json({success:false, message:` No Reservation with the id of ${req.params.id}`});
        }
        //Make sure user is the Reservation owner
        if(Reservation.user.toString()!== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to update this Reservation`});
        }
        Reservation=await Reservation.findByIdAndUpdate(req.params.id, req.body,{
            new:true,
            runValidators:true
        });
        res.status(200).json({
            success:true,
            data: Reservation
        });
    }catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message: "Cannot update Reservation"});
    }
};

//@desc Update Reservation
//@route PUT /api/v1/Reservations/:id
//@access Private
exports.deleteReservation=async (req,res, next)=>{
    try {
        let Reservation= await Reservation.findById(req.params.id);
        if(!Reservation){
            return res.status(404).json({success:false, message:` No Reservation with the id of ${req.params.id}`});
        }
        //Make sure user is the Reservation owner
        if(Reservation.user.toString()!== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to delete this Reservation`});
            }
        await Reservation.deleteOne();

        res.status(200).json({
            success:true,
            data: Reservation
        });
    }catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message: "Cannot delete Reservation"});
    }
};