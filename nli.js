const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default;


async function checkMsgData(msg){
  const msg_content = encodeURIComponent(msg);
  // console.log(msg_content);
  const url_get = "https://api.wit.ai/message?"+"v=20220901&"+"q="+msg_content;
  var response = await axios.get(url_get,{
    headers:{Authorization: "Bearer " + process.env.WITAI_SERVER_TOKEN }
  })
  // console.log(response.data);
  return response.data;
}
function standardDate(response){
  try{
    // console.log(response.entities["wit$datetime:datetime"][0].value);
    return new Date(response.entities["wit$datetime:datetime"][0].value);
  }catch(e){
    return;
  }
}
module.exports = { checkMsgData,standardDate };