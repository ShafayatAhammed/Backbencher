export default class ApiResponser {
  constructor(responser) {
    this.responser = responser;
  }

  sendApiResponse(statusCode, success, message, data = null) {
    this.responser
      .status(statusCode)
      .json({ success: success, message: message, data: data });
  }

  sendCookieResponse(cookieName, cookieValue, expiryTime) {
    this.responser.cookie(cookieName, cookieValue, {
      expires: expiryTime,
      httpOnly: true,
    });
  }

  sendClearCookieResponse(cookieName) {
    this.responser.clearCookie(cookieName);
  }
}
