const SHOWN_KEY = "minimalist-wardrobe:festival-shown";

// 固定公历日期；不将农历节日或每年变化的节气误写为固定日期。
const FESTIVALS = {
	"01-01": ["元旦", "新的一年，给自己一杯热奶茶，慢慢开启新的篇章。"],
	"02-14": ["情人节", "爱也可以留给自己，买份喜欢的甜品吧。"],
	"03-08": ["妇女节", "愿你自在明亮，今天也值得被温柔对待。"],
	"03-20": ["国际幸福日", "喝杯喜欢的咖啡，收集一点小小的幸福。"],
	"04-22": ["世界地球日", "去附近散散步，和春天轻轻打个招呼。"],
	"05-20": ["表达爱意的日子", "对自己说句喜欢，再奖励自己一份甜品。"],
	"06-01": ["儿童节", "保留一点孩子气，喝杯奶茶也很快乐。"],
	"08-08": ["夏日散步日", "找个舒服的时间去散步，感受夏天的微风吧。"],
	"10-01": ["国庆节", "给自己放慢脚步的时间，和喜欢的人吃顿火锅。"],
	"11-11": ["给自己的日子", "一个人也可以过得很好，点杯喜欢的咖啡吧。"],
	"12-24": ["平安夜", "愿这个夜晚温暖安稳，热饮和甜品都刚刚好。"],
	"12-31": ["跨年夜", "谢谢这一年的自己，带着温柔期待新的一年。"],
};

function localDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime()))
		throw new TypeError("日期必须是有效的 Date");
	const year = String(date.getFullYear()).padStart(4, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function readShown() {
	let value;
	try {
		value = uni.getStorageSync(SHOWN_KEY);
	} catch (error) {
		throw new Error(
			`读取节日提醒记录失败：${error && error.message ? error.message : String(error)}`,
		);
	}
	if (value === "" || value === undefined) return {};
	if (
		!value ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		!Object.keys(value).every(
			(key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && value[key] === true,
		)
	) {
		throw new Error("节日提醒记录已损坏，未进行任何修改");
	}
	return { ...value };
}

/**
 * 返回当天固定公历节日的信息；没有节日时返回 null。
 * @param {Date} [date]
 * @returns {import('../types').Festival | null}
 */
export function getTodayFestival(date = new Date()) {
	const day = localDate(date);
	const festival = FESTIVALS[day.slice(5)];
	return festival
		? { date: day, name: festival[0], message: festival[1] }
		: null;
}

/** 请在提醒实际展示后调用；写入失败会抛出异常。 @param {Date} [date] @returns {void} */
export function markFestivalShown(date = new Date()) {
	const day = localDate(date);
	const shown = readShown();
	if (shown[day]) return;
	shown[day] = true;
	try {
		uni.setStorageSync(SHOWN_KEY, shown);
	} catch (error) {
		throw new Error(
			`保存节日提醒记录失败：${error && error.message ? error.message : String(error)}`,
		);
	}
}

/** @param {Date} [date] @returns {boolean} */
export function wasFestivalShown(date = new Date()) {
	return readShown()[localDate(date)] === true;
}
