import ApiResponser from "./api-responser.js";

const errorHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (err) {
    const response = new ApiResponser(res);
    response.sendApiResponse(500, false, "Something went wrong!");
    throw err;
  }
};

export default errorHandler;
