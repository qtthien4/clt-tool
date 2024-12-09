const querystring = require("querystring");
// const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const {
  S3Client,
  GetObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const dayjs = require("dayjs");
const cheerio = require("cheerio");

const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

module.exports.loginBluePrint = async () => {
  let JSESSIONID;
  let OAuthToken;
  let location;
  const response = await fetch("https://blueprint.cyberlogitec.com.vn/", {
    redirect: "manual",
    referrerPolicy: "no-referrer",
  });
  JSESSIONID = response.headers.get("Set-Cookie").split(";")[0].split("=")[1];

  console.log("get JSESSIONID done!");

  const ssoResponse = await fetch(
    "https://blueprint.cyberlogitec.com.vn/sso/login",
    {
      redirect: "manual",
      referrerPolicy: "no-referrer",
      Connection: "keep-alive",
      headers: {
        cookie: `JSESSIONID=${JSESSIONID}`,
      },
    }
  );
  location = ssoResponse.headers.get("Location");
  OAuthToken = ssoResponse.headers
    .get("Set-Cookie")
    .split(";")[0]
    .split("=")[1];

  let cookie;
  let urlLogin;
  if (location) {
    const response = await fetch(location);

    cookie = response.headers
      .get("Set-Cookie")
      .split(", ")
      .map(e => e.split("; ")[0])
      .join("; ");
    const html = await response.text();

    const $ = cheerio.load(html);
    urlLogin = $("#login-form").attr("action");
    cookie = cookie;

    console.log("get cookie và url form done");
  } else {
    return null;
  }

  const data = {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    rememberMe: "on",
  };
  const formBody = querystring.stringify(data);

  let urlLogin2;
  await fetch(urlLogin, {
    redirect: "manual",
    headers: {
      cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
    method: "POST",
  }).then(response => {
    urlLogin2 = response.headers.get("Location");
  });

  console.log("get urlLogin2 done");

  let urlLoginLater;
  await fetch(urlLogin2, {
    redirect: "manual",
    headers: {
      cookie: `JSESSIONID=${JSESSIONID}; OAuth_Token_Request_State=${OAuthToken};`,
    },
    method: "GET",
  }).then(response => {
    urlLoginLater = response.headers.get("Location");
  });

  console.log("get urlLoginLater done");

  await fetch(urlLoginLater);

  return JSESSIONID;
};

module.exports.checkTimeWork = async JSESSIONID => {
  const today = dayjs().format("DD");
  const payloadTimeWork = {
    wrkDt: dayjs().startOf("month").format("YYYYMMDD"),
    fmtD: "",
    wrkT: "",
    timeZone: 420,
    checkMonthFlg: "Y",
  };
  const responseTimeWork = await fetch(
    "https://blueprint.cyberlogitec.com.vn/api/checkInOut/searchDailyAttendanceCheckInOut",
    {
      headers: {
        cookie: `JSESSIONID=${JSESSIONID};`,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(payloadTimeWork),
      method: "POST",
    }
  );
  console.log("get time work done");

  const timeWork = (await responseTimeWork.json()).data.listDailyAttendance[
    today - 1
  ];

  console.log("timeWork", timeWork);

  const randomMinutes = Math.floor(Math.random() * 6) + 1;
  console.log(randomMinutes);

  setTimeout(async () => {
    if (timeWork?.atndTms == null) {
      const res = await fetch(
        "https://blueprint.cyberlogitec.com.vn/api/checkInOut/insert",
        {
          headers: {
            cookie: `JSESSIONID=${JSESSIONID};`,
          },
          method: "POST",
        }
      );

      if (res.ok) {
        console.log(`đã checkin lúc ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`);
      } else {
        console.log(res);
      }
      return;
    }

    if (timeWork?.lveTms == null || Number(timeWork?.lveTms) < 1750) {
      const res = await fetch(
        "https://blueprint.cyberlogitec.com.vn/api/checkInOut/insert",
        {
          headers: {
            cookie: `JSESSIONID=${JSESSIONID};`,
          },
          method: "POST",
        }
      );

      if (res.ok) {
        console.log(`đã checkout lúc ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`);
      } else {
        console.log(res);
      }
      return;
    }
  }, randomMinutes * 58 * 1000);
};

module.exports.upKeyOnS3 = async body => {
  const keyName = "key_login_clv.txt";
  const bucketName = "s3-clv-login";

  const inputDelete = {
    Bucket: bucketName,
    Delete: {
      Objects: [
        {
          Key: keyName,
        },
      ],
    },
  };
  //delete before upload new file
  const command = new DeleteObjectsCommand(inputDelete);
  await s3Client.send(command);

  //upload new file
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Body: body,
      Key: keyName,
      ContentType: "text/plain",
    })
  );
  console.log(` uploaded successfully.`);
};

module.exports.getKeyOnS3 = async () => {
  const keyName = "key_login_clv.txt";
  const bucketName = "s3-clv-login";

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: keyName,
        ContentType: "text/plain",
      })
    );
    if (response.Body) {
      const str = await response.Body.transformToString();
      return str;
    }

    return "";
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

module.exports.checkKey = async JSESSIONID => {
  const response = await fetch(
    "https://blueprint.cyberlogitec.com.vn/api/getUserInfo",
    {
      redirect: "manual",
      referrerPolicy: "no-referrer",
      headers: {
        cookie: `JSESSIONID=${JSESSIONID}`,
      },
    }
  ).then(e => e.json());
  if (response.usrEml) {
    return true;
  } else return false;
};
