module.exports = {
	functions: {
		myfn_safe: [
			x => x,
			{ is_safe: ['html'] }
		],
		myfn: x => x,
	},
	filters: {
		myfn_safe: [
			x => x,
			{ is_safe: ['html'] }
		],
		myfn: x => x,
	}
};
