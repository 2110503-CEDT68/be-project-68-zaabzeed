const Restaurant = require('../models/Restaurant.js');
const Reservation = require('../models/Reservation.js');

//@desc   Get all restaurants
//@route  GET /api/v1/restaurants
//@access Public
exports.getRestaurants= async(req,res,next)=>{    
    let query;

    //copy req.query
    const reqQuery={...req.query};

    //Field to exclude
    const removeFields=['select', 'sort', 'page', 'limit'];

    //Loop over remove fields and deletе them from reqQuery
    removeFields.forEach((field) => delete reqQuery[field]);    console.log(reqQuery);

    //Create query string
    let queryStr=JSON.stringify(reqQuery);
    queryStr=queryStr.replace (/\b(gt|gte|lt|lte|in)\b/g,match=> `$${match}`);
    
    query=Restaurant.find(JSON.parse (queryStr)).populate('reservations');

    //Select Fields
    if(req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query=query.select(fields);
    }
    //sort
    if(req.query.sort) {
        const sortBy=req.query.sort.split(',').join(' ');
        query=query.sort(sortBy);
    }else {
        query = query.sort('-createdAt')
    }

    //Pagination
    const page=parseInt(req.query.page,10)|| 1;
    const limit=parseInt (req.query.limit,10)||25;
    const startIndex=(page-1)*limit;
    const endIndex=page*limit;
    try {
        const total=await Restaurant.countDocuments() ;
        query=query.skip(startIndex).limit(limit);
        //Executing query
        const restaurants = await query;

        //Pagination result
        const pagination ={};
            if (endIndex<total){
                pagination.next={
                    page:page+1,
                    limit
                }
            }
            if(startIndex>0) {
                pagination.prev= {
                    page:page-1,
                    limit
                }
            }
    res.status(200).json({success:true, count:restaurants.length, pagination, data:restaurants});
    }catch(err){
        res.status(400).json({success:false});
    }
};

//@desc   Get single restaurant
//@route  GET /api/v1/restaurants/:id
//@access Public
exports.getRestaurant = async (req, res, next) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if(!restaurant)
            return res.status(400).json({success:false});

        res.status(200).json({success:true, data:restaurant});
    }catch(err){
        res.status(400).json({success:false});
    }
    
};

//@desc   Create new restaurant
//@route  POST /api/v1/restaurants
//@access Private
exports.createRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({ success: true, data: restaurant });
  } catch (err) {
    res.status(400).json({ success: false, msg: err.message });
  }
};


//@desc   Update restaurant
//@route  PUT /api/v1/restaurants/:id
//@access Private
exports.updateRestaurant = async (req, res, next) => {
    try{
        const restaurant = await Restaurant.findByIdAndUpdate(req.params.id , req.body ,{
        new:true,
        runValidators:true
        })

        if(!restaurant)
            return res.status(400).json({success:false});

        res.status(200).json({success:true, data:restaurant});
        
    }catch(err){
        res.status(400).json({success:false});
    }
};

//@desc   Delete restaurant
//@route  DELETE /api/v1/restaurants/:id
//@access Private
exports.deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: `Restaurant not found with id of ${req.params.id}`
      });
    }

    // Delete related reservations first
    await Reservation.deleteMany({ restaurant: req.params.id });

    // Then delete restaurant
    await Restaurant.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    res.status(400).json({ success: false });
  }
};

