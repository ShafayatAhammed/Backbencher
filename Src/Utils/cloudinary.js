import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const cloudinaryUploader = async (localFile, localFileName) => {
  try {
    if (!localFile && !localFileName)
      throw new Error("The file path and name is required!");

    const uploadResult = await cloudinary.uploader.upload(localFile, {
      public_id: localFileName,
      resource_type: "auto",
    });

    fs.unlinkSync(localFile);

    return { url: uploadResult.url, publicId: uploadResult.public_id };
  } catch (err) {
    fs.unlinkSync(localFile);
    throw new Error(`Cloudinary file upload unsuccessful!\n${err}`);
  }
};

const cloudinaryDeleter = async (publicId) => {
  try {
    if (!publicId) throw new Error("Public id is required!");

    const deleteStatus = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });

    if (deleteStatus.result === "not found") {
      throw new Error("The file not found!");
    }
  } catch (err) {
    throw new Error(`Cloudinary file deletion unsuccessful!\n${err}`);
  }
};

export { cloudinaryUploader, cloudinaryDeleter };
