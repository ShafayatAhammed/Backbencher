import { Types } from "mongoose";
import VendorRequest from "../Models/vendors-requests.model.js";
import ApiResponser from "../Utils/api-responser.js";
import errorHandler from "../Utils/error-handler.js";
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from "../Utils/vendor-request-email-sender.js";

const applyToBecomeVendor = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);

  const {
    vendorName,
    vendorCategory,
    vendorType,
    vendorPhoneNumber,
    vendorEmailAddress,
  } = req.body;

  // Checking for required fields
  if (
    ![
      vendorName,
      vendorCategory,
      vendorType,
      vendorPhoneNumber,
      vendorEmailAddress,
    ].every((field) => {
      return field && field?.trim() !== "";
    })
  ) {
    return responser.sendApiResponse(
      400,
      false,
      "Please fill the required fields!",
      {
        reason: "Fields misssing",
      }
    );
  }

  // Checking for category validity
  const categories = [
    "APPAREL & ACCESSORIES",
    "ELECTRONICS & GADGETS",
    "HEALTH & BEAUTY",
    "HOME & GARDEN",
    "SPORTS & OUTDOORS",
    "AUTOMOTIVE",
    "TOYS & GAMES",
    "BOOKS & MEDIA",
    "FOOD & BEVERAGES",
    "OFFICE SUPPLIES",
    "PET SUPPLIES",
    "JEWELRY & WATCHES",
    "BABY & KIDS",
    "TOOLS & HARDWARE",
    "ARTS & CRAFTS",
    "TRAVEL & LUGGAGE",
    "OTHER",
  ];

  if (!categories.includes(vendorCategory)) {
    return responser.sendApiResponse(400, false, "Category is not valid!", {
      reason: "Category invalid",
    });
  }

  // Checking for type validity
  const types = ["INDIVIDUAL", "BUSINESS"];

  if (!types.includes(vendorType)) {
    return responser.sendApiResponse(400, false, "Type is not valid!", {
      reason: "Type invalid",
    });
  }

  // Checking for legal documents
  let governmentId;
  let tradeLicenseNumber;
  let TIN;

  if (vendorType === "INDIVIDUAL") {
    const { vendorGovernmentId } = req.body;

    if (!vendorGovernmentId) {
      return responser.sendApiResponse(
        400,
        false,
        "GovernmentId is required!",
        { reason: "GovernmentId missing" }
      );
    }

    governmentId = vendorGovernmentId;
  } else if (vendorType === "BUSINESS") {
    const { vendorTradeLicenseNumber, vendorTIN } = req.body;

    if (!vendorTradeLicenseNumber || !vendorTIN) {
      return responser.sendApiResponse(
        400,
        false,
        "Business documents are required!",
        { reason: "Business documents missing" }
      );
    }

    tradeLicenseNumber = vendorTradeLicenseNumber;
    TIN = vendorTIN;
  }

  const user = req.user;

  const vendorData = {
    user: user._id,
    vendorName,
    vendorCategory,
    vendorType,
    vendorPhoneNumber,
    vendorEmailAddress,
  };

  // Setting legal documents
  if (vendorType === "INDIVIDUAL") {
    vendorData.vendorGovernmentId = governmentId;
  } else if (vendorType === "BUSINESS") {
    vendorData.vendorTradeLicenseNumber = tradeLicenseNumber;
    vendorData.vendorTIN = TIN;
  }

  // Applying to become a vendor
  await VendorRequest.create(vendorData);

  return responser.sendApiResponse(200, true, "Applied to become a vendor.");
});

const getVendorRequest = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { requestId } = req.query;

  // Checking for requestid
  if (!requestId) {
    return responser.sendApiResponse(400, false, "RequestId is required!", {
      reason: "RequestId missing",
    });
  }

  // Checking for requestid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(requestId)) {
    return responser.sendApiResponse(400, false, "RequestId is not valid");
  }

  const request = await VendorRequest.findById(requestId);

  // Checking for request existence
  if (!request) {
    return responser.sendApiResponse(404, false, "No request found!");
  }

  if (request.status !== "PROCESSING") {
    await request.updateOne({ $set: { status: "PROCESSING" } });
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got the vendor request.",
    request
  );
});

const approveVendorRequest = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  const { requestId } = req.query;

  // Checking for requestid
  if (!requestId) {
    return responser.sendApiResponse(400, false, "RequestId is required!", {
      reason: "RequestId missing",
    });
  }

  // Checking for requestid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(requestId)) {
    return responser.sendApiResponse(400, false, "RequestId is not valid");
  }

  const request = await VendorRequest.findById(requestId);

  // Checking for request existence
  if (!request) {
    return responser.sendApiResponse(404, false, "No request found!");
  }

  // Getting user
  await request.populate("user");

  // Giving user vendor role if not
  if (request.user.role !== "VENDOR") {
    request.user.role = "VENDOR";
    await request.user.save();
  }

  // Sending approval email
  await sendApprovalEmail(request.vendorName, request.vendorEmailAddress);

  // Updating request status and setting to delete after 3 days
  const now = new Date();
  await request.updateOne({
    $set: {
      status: "APPROVED",
      expiryDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  return responser.sendApiResponse(200, true, "Request has been approved.");
});

const rejectVendorRequest = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for reject reason
  const { rejectReason } = req.body;

  if (!rejectReason) {
    return responser.sendApiResponse(400, false, "RejectReason is required!", {
      reason: "RejectReason missing",
    });
  }

  const { requestId } = req.query;

  // Checking for requestid
  if (!requestId) {
    return responser.sendApiResponse(400, false, "RequestId is required!", {
      reason: "RequestId missing",
    });
  }

  // Checking for requestid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(requestId)) {
    return responser.sendApiResponse(400, false, "RequestId is not valid");
  }

  const request = await VendorRequest.findById(requestId);

  // Checking for request existence
  if (!request) {
    return responser.sendApiResponse(404, false, "No request found!");
  }

  // Sending rejection email
  await sendRejectionEmail(
    request.vendorName,
    request.vendorEmailAddress,
    rejectReason
  );

  // Updating request status and setting to delete after 3 days
  const now = new Date();
  await request.updateOne({
    $set: {
      status: "REJECTED",
      expiryDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  return responser.sendApiResponse(200, true, "Request has been rejected.");
});

export {
  applyToBecomeVendor,
  getVendorRequest,
  approveVendorRequest,
  rejectVendorRequest,
};
