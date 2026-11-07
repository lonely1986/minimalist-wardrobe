const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const WEATHER_LABELS = {
	0: "晴朗",
	1: "大致晴朗",
	2: "局部多云",
	3: "阴天",
	45: "雾",
	48: "雾凇",
	51: "小毛毛雨",
	53: "毛毛雨",
	55: "大毛毛雨",
	56: "冻毛毛雨",
	57: "强冻毛毛雨",
	61: "小雨",
	63: "中雨",
	65: "大雨",
	66: "冻雨",
	67: "强冻雨",
	71: "小雪",
	73: "中雪",
	75: "大雪",
	77: "雪粒",
	80: "小阵雨",
	81: "阵雨",
	82: "强阵雨",
	85: "小阵雪",
	86: "大阵雪",
	95: "雷雨",
	96: "雷雨伴冰雹",
	99: "强雷雨伴冰雹",
};

export function weatherLabel(code) {
	return Object.prototype.hasOwnProperty.call(WEATHER_LABELS, code)
		? WEATHER_LABELS[code]
		: "天气情况未知";
}

export function validCoordinates(latitude, longitude) {
	return (
		typeof latitude === "number" &&
		Number.isFinite(latitude) &&
		latitude >= -90 &&
		latitude <= 90 &&
		typeof longitude === "number" &&
		Number.isFinite(longitude) &&
		longitude >= -180 &&
		longitude <= 180
	);
}

// Returns a cancellable request. Dates are the local dates supplied by Open-Meteo.
export function fetchForecast(latitude, longitude) {
	let task;
	let cancelled = false;
	let rejectRequest;
	const promise = new Promise((resolve, reject) => {
		rejectRequest = reject;
		if (!validCoordinates(latitude, longitude)) {
			reject(new Error("坐标无效，请检查纬度和经度。"));
			return;
		}
		task = uni.request({
			url: FORECAST_URL,
			method: "GET",
			timeout: 15000,
			data: {
				latitude,
				longitude,
				daily: "weather_code,temperature_2m_max,temperature_2m_min",
				timezone: "auto",
				forecast_days: 2,
			},
			success(response) {
				if (cancelled) return;
				if (
					!Number.isInteger(response.statusCode) ||
					response.statusCode < 200 ||
					response.statusCode >= 300
				) {
					reject(new Error("天气服务暂时不可用，请稍后重试。"));
					return;
				}
				const data = response.data;
				const daily = data && data.daily;
				const keys = [
					"time",
					"weather_code",
					"temperature_2m_max",
					"temperature_2m_min",
				];
				if (
					!daily ||
					!keys.every(
						(key) =>
							Array.isArray(daily[key]) && daily[key].length >= 2,
					)
				) {
					reject(new Error("天气数据不完整，请稍后重试。"));
					return;
				}
				const days = [0, 1].map((index) => ({
					date: daily.time[index],
					code: daily.weather_code[index],
					max: daily.temperature_2m_max[index],
					min: daily.temperature_2m_min[index],
				}));
				if (
					!days.every(
						(day) =>
							typeof day.date === "string" &&
							/^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
							Number.isInteger(day.code) &&
							Number.isFinite(day.max) &&
							Number.isFinite(day.min) &&
							day.max >= day.min,
					)
				) {
					reject(new Error("天气数据异常，请稍后重试。"));
					return;
				}
				resolve({
					days,
					timezone:
						typeof data.timezone === "string" ? data.timezone : "",
				});
			},
			fail() {
				if (!cancelled)
					reject(new Error("天气获取失败，请检查网络后重试。"));
			},
		});
	});
	return {
		promise,
		abort() {
			if (cancelled) return;
			cancelled = true;
			if (task && typeof task.abort === "function") task.abort();
			if (rejectRequest) rejectRequest(new Error("天气请求已取消。"));
		},
	};
}
