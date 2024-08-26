import errorHandler from "../Utils/error-handler.js";
import ApiResponser from "../Utils/api-responser.js";
import Vendor from "../Models/vendors.model.js";
import Product from "../Models/products.model.js";
import { cloudinaryDeleter, cloudinaryUploader } from "../Utils/cloudinary.js";
import { Types } from "mongoose";

const addProduct = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN" && user.role !== "VENDOR") {
    return responser.sendApiResponse(
      403,
      false,
      "You do not have access to this area!"
    );
  }

  // Checking for required fields
  const { name, description, price } = req.body;

  if (
    ![name, description].every((field) => field && field.trim() !== "") ||
    (price && price < 3)
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Please fill the required fields!",
      { reason: "Fields missing or invalid" }
    );
  }

  // Checking for required image
  const rawImages = req?.files?.images || [];
  if (!rawImages.length) {
    return responser.sendApiResponse(
      400,
      false,
      "At least one image is required!",
      { reason: "Image missing" }
    );
  }

  // Checking for userid if admin
  const { ObjectId } = Types;
  let userObjId;
  if (user.role === "ADMIN") {
    const { userId } = req.query;
    if (!userId || !ObjectId.isValid(userId)) {
      return responser.sendApiResponse(
        400,
        false,
        "Valid UserId is required!",
        { reason: "UserId missing or invalid" }
      );
    }
    userObjId = userId;
  }

  // Checking for vendorId
  const { vendorId } = req.query;
  if (!vendorId || !ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(
      400,
      false,
      "Valid VendorId is required!",
      { reason: "VendorId missing or invalid" }
    );
  }

  // Checking for vendor existence
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!");
  }

  // Uploading images
  const images = await Promise.all(
    rawImages.map(async (image) => {
      const { path: localImage, filename } = image;
      const { url, publicId } = await cloudinaryUploader(localImage, filename);
      return { imageUrl: url, imagePublicId: publicId };
    })
  );

  // Uploading videos if provided
  const rawVideos = req?.files?.videos || [];
  const videos = rawVideos.length
    ? await Promise.all(
        rawVideos.map(async (video) => {
          const { path: localVideo, filename } = video;
          const { url, publicId } = await cloudinaryUploader(
            localVideo,
            filename
          );
          return { videoUrl: url, videoPublicId: publicId };
        })
      )
    : [];

  // Creating product
  await Product.create({
    name,
    description,
    images,
    videos,
    price,
    vendor: vendorId,
  });

  return responser.sendApiResponse(200, true, "Product added successfully.");
});

const searchProducts = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { qt, category, rating, pmin, pmax, page } = req.query;
  const { attributes } = req.body;

  // Checking for query text
  if (!qt) {
    return responser.sendApiResponse(400, false, "Query text is required!", {
      reason: "Query text missing",
    });
  }

  const findCriteria = [];

  // Helper function to add $lookup stages
  const addLookup = (from, localField, foreignField, as) => {
    findCriteria.push({
      $lookup: {
        from,
        localField,
        foreignField,
        as,
      },
    });
  };

  // Searching for products
  findCriteria.push({
    $search: {
      index: "find_products",
      text: {
        query: qt,
        path: ["name", "description"],
        fuzzy: {},
      },
    },
  });

  // Retrieving categories if provided
  if (category) {
    addLookup("categories", "_id", "product", "categories");
  }
  // Retrieving attributes if provided
  if (attributes.length) {
    addLookup("attributes", "_id", "product", "attributes");
  }
  // Retrieving ratings if provided
  if (rating) {
    addLookup("review ratings", "_id", "product", "ratings");
  }
  // Retrieving vendors
  addLookup("vendors", "vendor", "_id", "vendors");
  // Retrieving Discounts
  addLookup("discounts", "_id", "products.product", "discounts");

  // Filtering with category if provided
  if (category) {
    findCriteria.push({
      $match: {
        "categories.name": category,
      },
    });
  }

  // Filtering with attriutes if provided
  if (attributes.length) {
    findCriteria.push({
      $match: {
        $expr: {
          $allElementsTrue: attributes.map((attribute) => ({
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$attributes",
                    as: "attribute",
                    cond: {
                      $and: [
                        {
                          $regexMatch: {
                            input: "$$attribute.name",
                            regex: new RegExp(attribute.name, "i"),
                          },
                        },
                        {
                          $regexMatch: {
                            input: "$$attribute.value",
                            regex: new RegExp(attribute.value, "i"),
                          },
                        },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          })),
        },
      },
    });
  }

  // Filtering with rating if provided
  if (rating) {
    findCriteria.push({
      $match: {
        $expr: {
          $gte: [{ $avg: "$ratings.rating" }, rating],
        },
      },
    });
  }

  // Checking for pmin and pmax validity
  if ((pmin && !pmax) || (!pmin && pmax)) {
    return responser.sendApiResponse(
      400,
      false,
      "Both Max price and Min price are required!",
      {
        reason: "Price range incomplete",
      }
    );
  }
  // Filtering with pmin and pmax if provided
  else if (pmin && pmax) {
    findCriteria.push({
      $match: {
        price: {
          $gte: parseFloat(pmin),
          $lte: parseFloat(pmax),
        },
      },
    });
  }

  // Adding pagination
  const currentPage = parseInt(page) || 1;
  findCriteria.push({ $skip: (currentPage - 1) * 50 }, { $limit: 50 });

  // Grouping documents with necessary fields
  findCriteria.push({
    $group: {
      _id: "$_id",
      image: { $first: "$images" },
      name: { $first: "$name" },
      regularPrice: { $first: "$price" },
      discountPrice: {
        $sum: {
          $reduce: {
            input: {
              $map: {
                input: "$discounts",
                as: "discount",
                in: {
                  $cond: [
                    { $ne: [{ $type: "$$discount.fixed" }, "missing"] },
                    "$$discount.fixed",
                    {
                      $cond: [
                        {
                          $ne: [{ $type: "$$discount.percentage" }, "missing"],
                        },
                        {
                          $multiply: [
                            { $divide: ["$$discount.percentage", 100] },
                            "$price",
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
              },
            },
            initialValue: 0,
            in: { $add: ["$$value", "$$this"] },
          },
        },
      },
      solds: { $first: "$solds" },
      rating: { $avg: "$ratings.rating" },
      vendorLogo: { $first: "$vendors.vendorLogo" },
      vendorName: { $first: "$vendors.vendorName" },
      categories: { $push: "$categories" },
      attributes: { $push: "$attributes" },
    },
  });

  // Including just necessary fields
  findCriteria.push({
    $project: {
      image: 1,
      name: 1,
      price: {
        regularPrice: "$regularPrice",
        discountPrice: "$discountPrice",
      },
      solds: 1,
      rating: 1,
      vendorLogo: "$vendorLogo.logoUrl",
      vendorName: 1,
      categories: {
        $reduce: {
          input: "$categories",
          initialValue: [],
          in: { $concatArrays: ["$$value", "$$this"] },
        },
      },
      attributes: {
        $reduce: {
          input: "$attributes",
          initialValue: [],
          in: { $concatArrays: ["$$value", "$$this"] },
        },
      },
    },
  });

  // Retrieving products
  const foundProducts = await Product.aggregate(findCriteria);

  return responser.sendApiResponse(
    200,
    true,
    "Products retrieved successfully.",
    foundProducts
  );
});

const getVendorProducts = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (!["ADMIN", "VENDOR"].includes(user.role)) {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area"
    );
  }

  const { ObjectId } = Types;
  let userObjId;

  // Checking for userid if admin
  if (user.role === "ADMIN") {
    const { userId } = req.query;

    if (!userId) {
      return responser.sendApiResponse(400, false, "UserId is required!", {
        reason: "UserId missing",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return responser.sendApiResponse(400, false, "UserId is invalid!", {
        reason: "UserId invalid",
      });
    }

    userObjId = userId;
  }

  const { vendorId } = req.query;

  // Checking for vendorid
  if (!vendorId) {
    return responser.sendApiResponse(400, false, "VendorId is required!", {
      reason: "VendorId missing",
    });
  }

  if (!ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(400, false, "VendorId is invalid!", {
      reason: "VendorId invalid",
    });
  }

  // Retrieving the vendor
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  // Checking for vendor existence
  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!");
  }

  // Retrieving vendor products
  const foundProducts = await Product.find({ vendor: foundVendor[0]._id });

  return responser.sendApiResponse(
    200,
    true,
    "Products retrieved successfully.",
    foundProducts
  );
});

const getProduct = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { productId } = req.query;

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for productid validity
  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Retrieving and processing products
  const foundProduct = await Product.aggregate([
    {
      $match: {
        _id: new ObjectId(productId),
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "product",
        as: "categories",
      },
    },
    {
      $lookup: {
        from: "discounts",
        localField: "_id",
        foreignField: "products.product",
        as: "discounts",
      },
    },
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventories",
      },
    },
    {
      $lookup: {
        from: "attributes",
        localField: "_id",
        foreignField: "product",
        as: "attributes",
      },
    },
    {
      $lookup: {
        from: "review ratings",
        localField: "_id",
        foreignField: "product",
        as: "reviewsRatings",
      },
    },
    {
      $lookup: {
        from: "tags",
        localField: "_id",
        foreignField: "product",
        as: "tags",
      },
    },
    {
      $addFields: {
        discount: {
          $sum: {
            $map: {
              input: "$discounts",
              as: "discount",
              in: {
                $cond: [
                  { $ne: [{ $type: "$$discount.fixed" }, "missing"] },
                  "$$discount.fixed",
                  {
                    $cond: [
                      { $ne: [{ $type: "$$discount.percentage" }, "missing"] },
                      {
                        $multiply: [
                          { $divide: ["$$discount.percentage", 100] },
                          "$price",
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
        stock: {
          $sum: "$inventories.quantity",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        images: {
          $reduce: {
            input: "$images",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        videos: {
          $reduce: {
            input: "$videos",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        discount: 1,
        stock: 1,
        attributes: {
          $reduce: {
            input: "$attributes",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        categories: {
          $reduce: {
            input: "$categories",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        tags: {
          $reduce: {
            input: "$tags",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        reviewsRatings: {
          $reduce: {
            input: "$reviewsRatings",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
        vendor: { $arrayElemAt: ["$vendor", 0] },
      },
    },
  ]);

  // Checking for products existence
  if (!foundProduct.length) {
    return responser.sendApiResponse(404, false, "No product found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "Product retrieved successfully.",
    foundProduct[0]
  );
});

const updateProduct = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN" && user.role !== "VENDOR") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for required field
  const { name, description, price } = req.body;

  if (
    [name, description, price].some((field, index) =>
      !field || index <= 1 ? field?.trim() === "" : field < 3
    )
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "At least one field is required!",
      { reason: "Fields missing" }
    );
  }

  const { ObjectId } = Types;
  let userObjId;

  // Checking for userid if admin
  if (user.role === "ADMIN") {
    const { userId } = req.query;

    if (!userId) {
      return responser.sendApiResponse(400, false, "UserId is required!", {
        reason: "UserId missing",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return responser.sendApiResponse(400, false, "UserId is invalid!", {
        reason: "UserId invalid",
      });
    }

    userObjId = userId;
  }

  const { productId, vendorId } = req.query;

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  // Checking for productid validity
  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Checking for vendorid
  if (!vendorId) {
    return responser.sendApiResponse(400, false, "VendorId is required!", {
      reason: "VendorId missing",
    });
  }

  // Checking for vendorid validity
  if (!ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(400, false, "VendorId is invalid!", {
      reason: "VendorId invalid",
    });
  }

  // Retrieving vendor
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  // Checking for vendor existence
  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!", {
      reason: "Vendor not found",
    });
  }

  // Retrieving product
  const foundProduct = await Product.aggregate([
    {
      $match: {
        vendor: foundVendor[0]._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(productId),
      },
    },
  ]);

  // Checking for product existence
  if (!foundProduct.length) {
    return responser.sendApiResponse(404, false, "No product found!", {
      reason: "Product not found",
    });
  }

  const updateFields = { $set: {} };

  // Checking for changed fields
  let hasChanged = false;
  if (name && name.trim() !== "" && name !== foundProduct[0].name) {
    updateFields.$set.name = name;
    hasChanged = true;
  }
  if (
    description &&
    description.trim() !== "" &&
    description !== foundProduct[0].description
  ) {
    updateFields.$set.description = description;
    hasChanged = true;
  }
  if (price && price.trim() !== "" && price !== foundProduct[0].price) {
    updateFields.$set.price = price;
    hasChanged = true;
  }

  // Checking for if no fields changed
  if (!hasChanged) {
    return responser.sendApiResponse(400, false, "Please change the values!", {
      reason: "Values unchanged",
    });
  }

  // Updating product
  await Product.updateOne({ _id: foundProduct[0]._id }, updateFields);
  return responser.sendApiResponse(200, true, "Product has been updated.");
});

const addProductImagesVideos = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN" && user.role !== "VENDOR") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const rawImages = req?.files?.images || [];
  const rawVideos = req?.files?.videos || [];

  // Checking for if at least one image or video provided
  if (!rawImages.length && !rawVideos.length) {
    return responser.sendApiResponse(
      400,
      false,
      "At least one image or video is required!",
      { reason: "Media missing" }
    );
  }

  const { ObjectId } = Types;
  let userObjId;

  // Checking for userid if admin
  if (user.role === "ADMIN") {
    const { userId } = req.query;

    if (!userId) {
      return responser.sendApiResponse(400, false, "UserId is required!", {
        reason: "UserId missing",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return responser.sendApiResponse(400, false, "UserId is invalid!", {
        reason: "UserId invalid",
      });
    }

    userObjId = userId;
  }

  const { vendorId, productId } = req.query;

  // Checking for vendorid
  if (!vendorId) {
    return responser.sendApiResponse(400, false, "VendorId is required!", {
      reason: "VendorId missing",
    });
  }

  // Checking for vendorid validity
  if (!ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(400, false, "VendorId is invalid!", {
      reason: "VendorId invalid",
    });
  }

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  // Checking for productid validity
  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Retrieving vendor
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  // Checking for vendor existence
  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!", {
      reason: "Vendor not found",
    });
  }

  // Retrieving product
  const foundProduct = await Product.aggregate([
    {
      $match: {
        vendor: foundVendor[0]._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(productId),
      },
    },
  ]);

  // Checking for product existence
  if (!foundProduct.length) {
    return responser.sendApiResponse(404, false, "No product found!", {
      reason: "Product not found",
    });
  }

  // Checking for if adding new images/videos exceeds limit
  if (
    foundProduct[0].images.length + rawImages.length > 10 ||
    foundProduct[0].videos.length + rawVideos.length > 10
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Max product image/video limit exceeded!",
      { reason: "Exceeded max image/video limit" }
    );
  }

  // Uploading images
  if (rawImages.length) {
    const images = await Promise.all(
      rawImages.map(async (image) => {
        const localImage = image.path;
        const uploadedImage = await cloudinaryUploader(
          localImage,
          image.filename
        );
        return {
          imageUrl: uploadedImage.url,
          imagePublicId: uploadedImage.publicId,
        };
      })
    );

    await Product.updateOne(
      { _id: foundProduct[0]._id },
      { $push: { images: { $each: images } } }
    );
  }

  // Uploading videos
  if (rawVideos.length) {
    const videos = await Promise.all(
      rawVideos.map(async (video) => {
        const localVideo = video.path;
        const uploadedVideo = await cloudinaryUploader(
          localVideo,
          video.filename
        );
        return {
          videoUrl: uploadedVideo.url,
          videoPublicId: uploadedVideo.publicId,
        };
      })
    );

    await Product.updateOne(
      { _id: foundProduct[0]._id },
      { $push: { videos: { $each: videos } } }
    );
  }

  return responser.sendApiResponse(200, true, "Images/Videos are added.");
});

const deleteProductImagesVideos = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN" && user.role !== "VENDOR") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const imageIds = req.query.imageIds ? req.query.imageIds.split(",") : [];
  const videoIds = req.query.videoIds ? req.query.videoIds.split(",") : [];

  // Checking for if at least one image or video id provided
  if (!imageIds.length && !videoIds.length) {
    return responser.sendApiResponse(
      400,
      false,
      "At least one image or video ID is required!",
      { reason: "Image/Video ID missing" }
    );
  }

  const { ObjectId } = Types;

  // Checking for imageids validity
  let validImageIds;

  if (imageIds.length) {
    validImageIds = imageIds.filter((id) => ObjectId.isValid(id));
  }

  if (validImageIds.length !== imageIds.length) {
    return responser.sendApiResponse(400, false, "ImageIds are invalid!", {
      reason: "ImageIds invalid",
    });
  }

  // Checking for videoids validity
  let validVideoIds;

  if (videoIds.length) {
    validVideoIds = videoIds.filter((id) => ObjectId.isValid(id));
  }

  if (validVideoIds.length !== videoIds.length) {
    return responser.sendApiResponse(400, false, "VideoIds are invalid!", {
      reason: "VideoIds invalid",
    });
  }

  let userObjId;

  // Checking for userid if admin
  if (user.role === "ADMIN") {
    const { userId } = req.query;

    if (!userId) {
      return responser.sendApiResponse(400, false, "UserId is required!", {
        reason: "UserId missing",
      });
    }

    if (!ObjectId.isValid(userId)) {
      return responser.sendApiResponse(400, false, "UserId is invalid!", {
        reason: "UserId invalid",
      });
    }

    userObjId = userId;
  }

  const { vendorId, productId } = req.query;

  // Checking for vendorid
  if (!vendorId) {
    return responser.sendApiResponse(400, false, "VendorId is required!", {
      reason: "VendorId missing",
    });
  }

  // Checking for vendorid validity
  if (!ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(400, false, "VendorId is invalid!", {
      reason: "VendorId invalid",
    });
  }

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  // Checking for productid validity
  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Retrieving vendor
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  // Checking for vendor existence
  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!", {
      reason: "Vendor not found",
    });
  }

  // Retrieving product
  const foundProduct = await Product.aggregate([
    {
      $match: {
        vendor: foundVendor[0]._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(productId),
      },
    },
  ]);

  // Checking for product existence
  if (!foundProduct.length) {
    return responser.sendApiResponse(404, false, "No product found!", {
      reason: "Product not found",
    });
  }

  // Function to filter an ids array
  const filterArray = (type, array, ids) => {
    return array[0][`${type}s`].filter((item) =>
      ids.includes(item._id.toString())
    );
  };

  // Deleting images
  if (imageIds.length) {
    const filteredImages = filterArray("image", foundProduct, imageIds);

    if (filteredImages.length !== imageIds.length) {
      return responser.sendApiResponse(
        400,
        false,
        "Some image IDs are invalid!",
        {
          reason: "ImageIds invalid",
        }
      );
    }

    for (const image of filteredImages) {
      await cloudinaryDeleter(image.imagePublicId);
    }

    await Product.updateOne(
      { _id: foundProduct[0]._id },
      {
        $pull: {
          images: { _id: { $in: filteredImages.map((img) => img._id) } },
        },
      }
    );
  }

  // Deleting videos
  if (videoIds.length) {
    const filteredVideos = filterArray("video", foundProduct, videoIds);

    if (filteredVideos.length !== videoIds.length) {
      return responser.sendApiResponse(
        400,
        false,
        "Some video IDs are invalid!",
        {
          reason: "VideoIds invalid",
        }
      );
    }

    for (const video of filteredVideos) {
      await cloudinaryDeleter(video.videoPublicId);
    }

    await Product.updateOne(
      { _id: foundProduct[0]._id },
      {
        $pull: {
          videos: { _id: { $in: filteredVideos.map((vid) => vid._id) } },
        },
      }
    );
  }

  return responser.sendApiResponse(200, true, "Images/Videos deleted.");
});

const deleteProducts = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN" && user.role !== "VENDOR") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const productIds = req.query.productIds
    ? req.query.productIds.split(",")
    : [];

  // Checking for productids
  if (!productIds.length) {
    return responser.sendApiResponse(
      400,
      false,
      "At least one product ID is required!",
      { reason: "Product ID missing" }
    );
  }

  const { ObjectId } = Types;

  // Checking for valid productids
  let validProductIds;

  if (productIds.length) {
    validProductIds = productIds.filter((id) => ObjectId.isValid(id));
  }

  if (validProductIds.length !== productIds.length) {
    return responser.sendApiResponse(400, false, "ProductIds are invalid!", {
      reason: "ProductIds invalid",
    });
  }

  let userObjId;

  // Checking for userid if admin
  if (user.role === "ADMIN") {
    const { userId } = req.query;
    if (!userId) {
      return responser.sendApiResponse(400, false, "UserId is required!", {
        reason: "UserId missing",
      });
    }
    if (!ObjectId.isValid(userId)) {
      return responser.sendApiResponse(400, false, "UserId is invalid!", {
        reason: "UserId invalid",
      });
    }
    userObjId = userId;
  }

  const { vendorId } = req.query;

  // Checking for vendorid
  if (!vendorId) {
    return responser.sendApiResponse(400, false, "VendorId is required!", {
      reason: "VendorId missing",
    });
  }

  // Checking for vendorid validity
  if (!ObjectId.isValid(vendorId)) {
    return responser.sendApiResponse(400, false, "VendorId is invalid!", {
      reason: "VendorId invalid",
    });
  }

  // Retrieving vendor
  const foundVendor = await Vendor.aggregate([
    {
      $match: {
        user: user.role === "ADMIN" ? new ObjectId(userObjId) : user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(vendorId),
      },
    },
  ]);

  // Checking for vendor existence
  if (!foundVendor.length) {
    return responser.sendApiResponse(404, false, "No vendor found!", {
      reason: "Vendor not found",
    });
  }

  // Retrieving products
  const foundProducts = await Product.aggregate([
    {
      $match: {
        vendor: foundVendor[0]._id,
      },
    },
    {
      $match: {
        _id: { $in: productIds.map((id) => new ObjectId(id)) },
      },
    },
  ]);

  // Checking for products existence
  if (!foundProducts.length) {
    return responser.sendApiResponse(404, false, "No products found!", {
      reason: "Products not found",
    });
  }

  // Function to delete media from cloudinary
  const deleteMedia = async (mediaArray, deleteFunction) => {
    return Promise.all(
      mediaArray.map(async (media) => {
        await deleteFunction(media);
      })
    );
  };

  // Deleting images and videos
  await Promise.all(
    foundProducts.map(async (product) => {
      // Delete images
      await deleteMedia(product.images, async (image) => {
        await cloudinaryDeleter(image.imagePublicId);
      });

      // Delete videos
      await deleteMedia(product.videos, async (video) => {
        await cloudinaryDeleter(video.videoPublicId);
      });
    })
  );

  // Deleting products
  await Product.deleteMany({
    _id: { $in: productIds.map((id) => new ObjectId(id)) },
  });

  return responser.sendApiResponse(200, true, "Products deleted successfully.");
});

export {
  addProduct,
  searchProducts,
  getVendorProducts,
  getProduct,
  updateProduct,
  addProductImagesVideos,
  deleteProductImagesVideos,
  deleteProducts,
};
