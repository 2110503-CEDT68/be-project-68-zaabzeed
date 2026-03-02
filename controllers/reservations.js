const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');

function isWithinOpenHours(reservationDate, openCloseTime) {
    if (!openCloseTime || !openCloseTime.includes('-')) return true;

    const [openStr, closeStr] = openCloseTime.split('-').map(s => s.trim());
    const [oh, om] = openStr.split(':').map(Number);
    const [ch, cm] = closeStr.split(':').map(Number);

    //ดึงเวลาไทยจาก string โดยตรง
    const timePart = reservationDate.split('T')[1];
    const [rh, rm] = timePart.split(':').map(Number);

    const minutes = rh * 60 + rm;

    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    if (closeMin < openMin) {
        return minutes >= openMin || minutes <= closeMin;
    }

    return minutes >= openMin && minutes <= closeMin;
}

//@desc Get all reservations
//@routeGET /api/v1/reservations
//@access Privat
exports.getReservations = async(req,res,next)=>{
    let query;
    //General users can see only their reservations!
    if(req.user.role !== 'admin'){
        query=Reservation.find({user:req.user.id}).populate({
            path:'restaurant',
            select: 'name province tel'
        });
    }else{ //If you are an admin, you can see all!
        if (req.params.restaurantId) {
            console.log(req.params.restaurantId);
            query = Reservation.find({restaurant:req.params.restaurantId}).populate({
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
        const reservations= await query;
        
        res.status (200).json({
            success:true,
            count: reservations.length,
            data: reservations
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Reservation"});
    }
};

//@desc Get single reservation
//@route GET /api/v1/reservations/:id
//@access Public
exports.getReservation=async(req,res,next)=>{
    try {
        const reservation= await Reservation.findById(req.params.id).populate({
            path: 'restaurant',
            select: 'name description tel'
        });

        if(!reservation){
            return res.status(404).json({success:false, message:` No reservation with the id of ${req.params.id}`});
        }
        if(reservation.user.toString() !== req.user.id && req.user.role !== 'admin') {

            return res.status(401).json({
                success:false, msg:'Not authorized to access this reservation'
            });
        }
        res.status(200).json({
            success:true,
            data: reservation
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message:"Cannot find Reservation"});
    }
};

//@desc Add reservation
//@route POST /api/v1/restaurants/:restaurantId/reservations
//@access Private
exports.addReservation = async (req,res,next)=>{
    try {

        req.body.restaurant = req.params.restaurantId;

        const restaurant = await Restaurant.findById(req.params.restaurantId);        
        
        if(!restaurant){
            return res.status(404).json({
                success:false,
                message:`No restaurant with the id of ${req.params.restaurantId}`
            });
        }

        // ✅ 1) Validate tables (ต่อการจอง)
        const tables = Number(req.body.tables);

        if (!Number.isInteger(tables) || tables < 1 || tables > 3) {
            return res.status(400).json({
                success:false,
                message:"Tables must be between 1-3"
            });
        }

        // ✅ 2) เช็คเวลาเปิด-ปิด
        if (!isWithinOpenHours(req.body.reservationDate, restaurant.openCloseTime)) {
            return res.status(400).json({
                success:false,
                message:"Restaurant is closed at selected time"
            });
        }

        // add user Id to req.body
        req.body.user = req.user.id;

        // ❌ ลบ existedReservations.length >=3 แบบเดิมออก
        // ✅ 3) รวมจำนวนโต๊ะทั้งหมดของ user
        const agg = await Reservation.aggregate([
            { $match: { user: req.user._id } },
            { $group: { _id: null, totalTables: { $sum: "$tables" } } }
        ]);

        const totalTables = agg.length ? agg[0].totalTables : 0;

        if (totalTables + tables > 3 && req.user.role !== 'admin'){
            return res.status(400).json({
                success:false,
                message:`You already reserved ${totalTables} table(s). Total cannot exceed 3`
            });
        }

        // ✅ สร้าง reservation
        const reservation = await Reservation.create({
            user: req.user.id,
            restaurant: req.params.restaurantId,
            reservationDate: req.body.reservationDate,
            tables: tables
        });

        res.status(201).json({
            success:true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot create Reservation"
        });
    }
}

//@desc Update reservation
//@route PUT /api/v1/reservations/:id
//@access Private
exports.updateReservation = async (req,res,next)=>{
    try {
        let reservation = await Reservation.findById(req.params.id);

        if(!reservation){
            return res.status(404).json({
                success:false,
                message:`No reservation with the id of ${req.params.id}`
            });
        }

        // owner check
        if(reservation.user.toString() !== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({
                success:false,
                message:`User ${req.user.id} is not authorized to update this reservation`
            });
        }

        const tables = Number(req.body.tables ?? reservation.tables);

        if (!Number.isInteger(tables) || tables < 1 || tables > 3) {
            return res.status(400).json({
                success:false,
                message:"Tables must be between 1-3"
            });
        }

        // หา restaurant
        const restaurant = await Restaurant.findById(reservation.restaurant);
        if (!restaurant) {
            return res.status(404).json({
                success:false,
                message:"Restaurant not found"
            });
        }

        const newDate = req.body.reservationDate ?? reservation.reservationDate;

        // เช็คเวลาเปิด-ปิด
        if (!isWithinOpenHours(newDate, restaurant.openCloseTime)) {
            return res.status(400).json({
                success:false,
                message:"Restaurant is closed at selected time"
            });
        }

        // รวมโต๊ะทั้งหมดของ user (ยกเว้น reservation นี้)
        const agg = await Reservation.aggregate([
            { $match: { user: req.user.id, _id: { $ne: reservation._id } } },
            { $group: { _id: null, totalTables: { $sum: "$tables" } } }
        ]);

        const totalTables = agg.length ? agg[0].totalTables : 0;

        if (totalTables + tables > 3 && req.user.role !== 'admin'){
            return res.status(400).json({
                success:false,
                message:`Total tables cannot exceed 3`
            });
        }

        reservation.tables = tables;
        reservation.reservationDate = newDate;

        await reservation.save();

        res.status(200).json({
            success:true,
            data: reservation
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot update Reservation"
        });
    }
};

//@desc Delete reservation
//@route DELETE /api/v1/reservations/:id
//@access Private
exports.deleteReservation=async (req,res, next)=>{
    try {
        let reservation= await Reservation.findById(req.params.id);
        if(!reservation){
            return res.status(404).json({success:false, message:` No reservation with the id of ${req.params.id}`});
        }
        //Make sure user is the reservation owner
        if(reservation.user.toString()!== req.user.id && req.user.role !== 'admin'){
            return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to delete this reservation`});
            }
        await reservation.deleteOne();

        res.status(200).json({
            success:true,
            data: reservation
        });
    }catch (error) {
        console.log(error);
        return res.status(500).json({success:false, message: "Cannot delete Reservation"});
    }
};