export const loginBluePrint = async () => {
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
    username: "thienvq",
    password: "Thien!@#",
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

export const checkTimeWork = async JSESSIONID => {
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

  console.log(timeWork);

  if (timeWork?.atndTms == null) {
    fetch("https://blueprint.cyberlogitec.com.vn/api/checkInOut/insert", {
      headers: {
        cookie: `JSESSIONID=${JSESSIONID};`,
      },
      method: "POST",
    });

    console.log(`đã checkin lúc ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`);
    return;
  }
  //check luc 17:40
  if (timeWork?.lveTms == null || Number(timeWork?.lveTms) < 1750) {
    console.log("bắt đầu checkout");
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
      console.log(res.status);
    }
    return;
  }
};

export const getKeyOnS3 = async () => {
  const bucketName = "s3-clv-login";
  const keyName = "key_login_clv.txt";
  const key = await loginBluePrint();
  const params = {
    Bucket: bucketName,
    Key: keyName,
    Body: key,
    ContentType: "text/plain",
  };

  try {
    s3.deleteObject(params, async function (error, data) {
      if (error) {
        console.log("Delete S3 Object error: ", error.stack);
      } else {
        console.log(keyName, " delete success");
      }
    });
  } catch (error) {
    console.log(error);
  }
  try {
    // Upload file lên S3
    const data = await s3.putObject(params).promise();
    console.log("Successfully uploaded data to", bucketName, keyName);
    return {
      statusCode: 200,
      body: JSON.stringify("Upload successful!"),
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify("Upload failed!"),
    };
  }
};
