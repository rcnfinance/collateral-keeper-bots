module.exports.report = (message, element) => {
  console.log(message);
  console.log('\t', element);
};

module.exports.reportError = (message, element, error) => {
  console.log(message);
  console.log('\t', element);
  console.log('\t', error);
};
