module.exports.report = (message, element) => {
  console.log(message);
  console.log(element);
};

module.exports.reportErrorreport = (message, element, error) => {
  console.log(message);
  console.log(element);
  console.log(error);
};
