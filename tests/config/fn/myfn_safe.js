module.exports = {
	myfn_safe: [
		x => x,
		{ is_safe: ['html'] }
	],
	myfn: x => x,
};
