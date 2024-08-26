import multer from "multer";
import path from "path";

const uploadStorage = multer.diskStorage({
  destination: function (_, file, cb) {
    cb(null, "./Public");
  },
  filename: function (_, file, cb) {
    if (file) {
      const uniqueSuffix =
        path.parse(file.originalname).name +
        "_" +
        Date.now() +
        "_" +
        Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix);
    } else {
      cb(null, "no_file");
    }
  },
});

const uploader = multer({ storage: uploadStorage });

export default uploader;
