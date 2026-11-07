<template>
	<view class="page-shell recommend-page">
		<view class="page-header hero">
			<text class="eyebrow hero-eyebrow">A LITTLE OUTFIT NOTE</text>
			<text class="page-title hero-title">今天，穿得舒服一点</text>
			<text class="page-subtitle hero-subtitle"
				>看看天气，也听听自己的心情。</text
			>
		</view>

		<view class="card weather-card">
			<view class="section-heading">
				<view class="heading-copy">
					<text class="eyebrow small-eyebrow">THE WEATHER</text>
					<text class="section-title section-name">天气与温度</text>
				</view>
				<text class="weather-mark">☼</text>
			</view>
			<text class="weather-hint"
				>定位仅用于查询天气；也可以选择城市或自行填写气温。</text
			>

			<view v-if="weatherLoading" class="notice" role="status">{{
				loadingText
			}}</view>
			<view v-if="weatherError" class="notice notice-error">
				<text>{{ weatherError }}</text>
				<view class="notice-actions">
					<button class="text-button" @click="retryWeather">
						重试
					</button>
					<button
						v-if="locationDenied"
						class="text-button"
						@click="openSettings"
					>
						打开权限设置
					</button>
				</view>
			</view>

			<view v-if="forecast && !weatherLoading" class="day-grid">
				<button
					v-for="(day, index) in forecast.days"
					:key="day.date"
					class="day-tile"
					:class="{ selected: selectedDay === index }"
					@click="selectDay(index)"
				>
					<view class="day-top"
						><text>{{ index === 0 ? "今天" : "明天" }}</text
						><text class="day-date">{{ day.date }}</text></view
					>
					<text class="day-weather">{{
						weatherLabel(day.code)
					}}</text>
					<text class="day-temperature"
						>{{ formatTemperature(day.max) }}°
						<text class="day-low"
							>/ {{ formatTemperature(day.min) }}°</text
						></text
					>
				</button>
			</view>
			<view v-if="forecast && !weatherLoading" class="source-note"
				><text v-if="selectedCity">{{ selectedCity }} · </text>日期为所选地点当地日期<text
					v-if="forecast.timezone"
					>（{{ forecast.timezone }}）</text
				></view
			>
			<text
				v-if="forecast && !weatherLoading"
				class="source-note source-link"
				@click="copySourceLink"
				>Weather data by Open-Meteo.com（CC BY 4.0，点击复制链接）</text
			>

			<view
				v-if="manualTemperature !== null && !weatherLoading"
				class="manual-summary"
			>
				<view class="manual-heading"
					><text>手动气温</text
					><text class="manual-value"
						>{{ formatTemperature(manualTemperature) }}°C</text
					></view
				>
				<text class="source-note"
					>由你输入，并非真实天气；今天和明天均使用此气温。</text
				>
				<view class="manual-days">
					<button
						class="pill"
						:class="{ active: selectedDay === 0 }"
						@click="selectDay(0)"
					>
						今天
					</button>
					<button
						class="pill"
						:class="{ active: selectedDay === 1 }"
						@click="selectDay(1)"
					>
						明天
					</button>
				</view>
			</view>

			<view class="divider"></view>
			<button
				class="location-button"
				:disabled="weatherLoading"
				@click="loadLocation"
			>
				◎ 使用当前位置查询天气
			</button>
			<view class="input-section">
				<text class="input-label">或者选择城市</text>
				<input
					v-model="cityQuery"
					class="soft-input city-search"
					type="text"
					placeholder="搜索城市，如 杭州"
					placeholder-class="placeholder"
				/>
				<view v-if="visibleCities.length" class="city-list">
					<view
						v-for="city in visibleCities"
						:key="city.name"
						class="pill city-pill"
						:class="{ active: selectedCity === city.name }"
						@click="selectCity(city)"
						>{{ city.name }}</view
					>
				</view>
				<text v-else class="input-help"
					>没有找到这个城市，可以换个名称，或手动输入气温。</text
				>
			</view>
			<view class="input-section">
				<text class="more-link" @click="showCoordinates = !showCoordinates"
					>{{ showCoordinates ? "收起经纬度" : "找不到城市？使用经纬度" }}</text
				>
			</view>
			<view v-if="showCoordinates" class="input-section">
				<view class="coordinate-row">
					<input
						v-model="latitudeInput"
						class="soft-input coordinate-input"
						type="text"
						placeholder="纬度，如 39.9"
						placeholder-class="placeholder"
					/>
					<input
						v-model="longitudeInput"
						class="soft-input coordinate-input"
						type="text"
						placeholder="经度，如 116.4"
						placeholder-class="placeholder"
					/>
					<button class="small-button" @click="loadCoordinates">
						查询
					</button>
				</view>
				<text class="input-help"
					>请填写十进制坐标，南纬和西经使用负数。</text
				>
			</view>
			<view class="input-section">
				<text class="input-label">没有天气数据？手动输入气温</text>
				<view class="coordinate-row">
					<input
						v-model="temperatureInput"
						class="soft-input"
						type="text"
						placeholder="输入气温，单位 °C"
						placeholder-class="placeholder"
					/>
					<button
						class="small-button"
						@click="applyManualTemperature"
					>
						使用气温
					</button>
				</view>
			</view>
		</view>

		<view class="outfit-heading">
			<view class="heading-copy">
				<text class="eyebrow small-eyebrow">YOUR OUTFIT</text>
				<text class="section-title section-name">为你搭配</text>
			</view>
			<button
				class="change-button"
				:disabled="!canRecommend"
				@click="changeOutfit"
			>
				↻ 换一套
			</button>
		</view>
		<text
			v-if="recommendationTemperature !== null"
			class="outfit-description"
			>{{ selectedDay === 0 ? "今天" : "明天" }} ·
			{{
				manualTemperature !== null
					? "手动气温"
					: "按最高、最低温的平均值"
			}}
			{{ formatTemperature(recommendationTemperature) }}°C 推荐</text
		>
		<text v-else class="outfit-description"
			>获取天气或输入气温后，为你挑选衣橱里的单品。</text
		>

		<view v-if="clothesLoading" class="card empty-card">正在读取衣橱…</view>
		<view v-else-if="clothesError" class="card empty-card">
			<text>{{ clothesError }}</text>
			<button class="text-button retry-clothes" @click="loadClothes">
				重新读取
			</button>
		</view>
		<view v-else-if="recommendError" class="card empty-card">{{
			recommendError
		}}</view>
		<view v-else-if="!clothes.length" class="card empty-card"
			>衣橱里还没有衣物，添加一些单品后再来搭配吧。</view
		>
		<view v-else-if="!outfit" class="card empty-card"
			>先选择天气或输入气温，开启今天的搭配。</view
		>
		<view v-else class="outfit-grid">
			<view
				v-for="slot in outfitSlots"
				:key="slot.key"
				class="card outfit-card"
			>
				<view class="item-image-wrap">
					<image
						v-if="slot.item && slot.item.photo"
						class="item-image"
						:src="slot.item.photo"
						mode="aspectFill"
					></image>
					<text v-else class="item-placeholder">{{
						slot.item ? "◌" : "＋"
					}}</text>
				</view>
				<view class="item-info">
					<text class="item-category"
						>{{ slot.label
						}}<text v-if="slot.key === 'accessory'">
							· 可选</text
						></text
					>
					<text class="item-name">{{
						slot.item
							? slot.item.name || "未命名单品"
							: slot.key === "accessory"
								? "无需配饰也很好"
								: "暂无合适单品"
					}}</text>
				</view>
			</view>
		</view>
		<view
			v-if="outfit && outfit.missing && outfit.missing.length"
			class="missing-note"
			>衣橱中还缺少：{{
				outfit.missing.join("、")
			}}。可以添加对应单品，再试试搭配。</view
		>
		<button
			v-if="hasOutfitItems"
			class="record-button"
			@click="recordOutfit"
		>
			{{ selectedDay === 0 ? "今天穿这套，记入日记" : "排进明天的计划" }}
		</button>
		<view v-if="changeMessage" class="change-note">{{
			changeMessage
		}}</view>
		<view class="footer-note">穿衣没有标准答案，适合自己就好。</view>
	</view>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from "vue";
import { onShow, onUnload } from "@dcloudio/uni-app";
import {
	getClothes,
	getOutfitLogs,
	getSettings,
	saveOutfitLog,
	saveSettings,
} from "@/utils/storage.js";
import { CITIES, findCity } from "@/utils/cities.js";
import { addDays, formatDate } from "@/utils/outfitStats.js";
import { recommendOutfit } from "@/utils/clothing.js";
import {
	fetchForecast,
	validCoordinates,
	weatherLabel,
} from "@/utils/weather.js";

const forecast = ref(null);
const manualTemperature = ref(null);
const selectedDay = ref(0);
const latitudeInput = ref("");
const longitudeInput = ref("");
const temperatureInput = ref("");
const cityQuery = ref("");
const selectedCity = ref("");
const showCoordinates = ref(false);
const weatherLoading = ref(false);
const loadingText = ref("");
const weatherError = ref("");
const locationDenied = ref(false);
const clothes = ref([]);
const clothesLoading = ref(false);
const clothesError = ref("");
const outfit = ref(null);
const recommendError = ref("");
const changeMessage = ref("");
let weatherVersion = 0;
let clothesVersion = 0;
let activeRequest = null;
let disposed = false;
let lastWeatherSource = { type: "location" };
let started = false;
let recommendationSeed = 0;

const recommendationTemperature = computed(() => {
	if (manualTemperature.value !== null) return manualTemperature.value;
	if (!forecast.value) return null;
	const day = forecast.value.days[selectedDay.value];
	return (day.max + day.min) / 2;
});
const visibleCities = computed(() => {
	const query = cityQuery.value.trim();
	return query
		? CITIES.filter((city) => city.name.includes(query))
		: CITIES.slice(0, 12);
});
const canRecommend = computed(
	() =>
		!clothesLoading.value &&
		!weatherLoading.value &&
		!clothesError.value &&
		clothes.value.length > 0 &&
		recommendationTemperature.value !== null,
);
const outfitSlots = computed(() => [
	{ key: "top", label: "上装", item: outfit.value && outfit.value.top },
	{ key: "bottom", label: "下装", item: outfit.value && outfit.value.bottom },
	{ key: "shoes", label: "鞋子", item: outfit.value && outfit.value.shoes },
	{
		key: "accessory",
		label: "配饰",
		item: outfit.value && outfit.value.accessory,
	},
]);

const hasOutfitItems = computed(() =>
	outfitSlots.value.some((slot) => slot.item),
);

function formatTemperature(value) {
	return String(Math.round(value * 10) / 10);
}

function beginWeather(text) {
	weatherVersion += 1;
	if (activeRequest) activeRequest.abort();
	activeRequest = null;
	forecast.value = null;
	manualTemperature.value = null;
	outfit.value = null;
	changeMessage.value = "";
	weatherError.value = "";
	locationDenied.value = false;
	weatherLoading.value = true;
	loadingText.value = text;
	return weatherVersion;
}

async function requestForecast(latitude, longitude, version) {
	if (disposed || version !== weatherVersion) return;
	loadingText.value = "正在获取天气预报…";
	const request = fetchForecast(latitude, longitude);
	activeRequest = request;
	try {
		const result = await request.promise;
		if (disposed || version !== weatherVersion) return;
		forecast.value = result;
		weatherLoading.value = false;
		activeRequest = null;
		makeRecommendation();
	} catch (error) {
		if (disposed || version !== weatherVersion) return;
		weatherLoading.value = false;
		activeRequest = null;
		weatherError.value = error.message || "天气获取失败，请稍后重试。";
	}
}

function loadLocation() {
	selectedCity.value = "";
	lastWeatherSource = { type: "location" };
	const version = beginWeather("正在获取位置，请留意定位权限提示…");
	uni.getLocation({
		type: "wgs84",
		success(location) {
			if (disposed || version !== weatherVersion) return;
			requestForecast(location.latitude, location.longitude, version);
		},
		fail(error) {
			if (disposed || version !== weatherVersion) return;
			weatherLoading.value = false;
			locationDenied.value =
				/auth deny|auth denied|permission|authorize|denied/i.test(
					(error && error.errMsg) || "",
				);
			weatherError.value = locationDenied.value
				? "定位权限未开启。可在设置中允许定位，或选择城市、手动输入气温。"
				: "暂时无法获取位置，请检查定位服务，或选择城市、手动输入气温。";
		},
	});
}

function parseNumber(value) {
	const text = String(value).trim();
	if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
	const number = Number(text);
	return Number.isFinite(number) ? number : null;
}

function selectCity(city) {
	selectedCity.value = city.name;
	lastWeatherSource = {
		type: "coordinates",
		latitude: city.latitude,
		longitude: city.longitude,
	};
	try {
		saveSettings({ city: city.name });
	} catch (error) {
		// 记不住城市不影响本次查询。
	}
	const version = beginWeather(`正在查询${city.name}的天气…`);
	requestForecast(city.latitude, city.longitude, version);
}

function savedCity() {
	try {
		return findCity(getSettings().city);
	} catch (error) {
		return null;
	}
}

function copySourceLink() {
	uni.setClipboardData({ data: "https://open-meteo.com/" });
}

function loadCoordinates() {
	const latitude = parseNumber(latitudeInput.value);
	const longitude = parseNumber(longitudeInput.value);
	if (!validCoordinates(latitude, longitude)) {
		weatherError.value =
			"请输入有效坐标：纬度为 -90 至 90，经度为 -180 至 180。";
		locationDenied.value = false;
		return;
	}
	selectedCity.value = "";
	lastWeatherSource = { type: "coordinates", latitude, longitude };
	const version = beginWeather("正在查询所填坐标的天气…");
	requestForecast(latitude, longitude, version);
}

function retryWeather() {
	if (lastWeatherSource.type === "coordinates") {
		const version = beginWeather("正在重新查询天气…");
		requestForecast(
			lastWeatherSource.latitude,
			lastWeatherSource.longitude,
			version,
		);
	} else {
		loadLocation();
	}
}

function openSettings() {
	uni.openSetting({
		fail() {
			uni.showToast({
				title: "请在小程序设置中开启定位权限",
				icon: "none",
			});
		},
	});
}

function applyManualTemperature() {
	const temperature = parseNumber(temperatureInput.value);
	if (temperature === null || temperature < -100 || temperature > 100) {
		weatherError.value = "请输入 -100 至 100°C 之间的有效气温。";
		locationDenied.value = false;
		return;
	}
	beginWeather("");
	weatherLoading.value = false;
	manualTemperature.value = temperature;
	makeRecommendation();
}

function selectDay(index) {
	selectedDay.value = index;
	changeMessage.value = "";
	makeRecommendation();
}

async function loadClothes() {
	const version = ++clothesVersion;
	clothesLoading.value = true;
	clothesError.value = "";
	try {
		const result = await Promise.resolve(getClothes());
		if (disposed || version !== clothesVersion) return;
		if (!Array.isArray(result)) throw new Error("invalid clothes");
		clothes.value = result;
		clothesLoading.value = false;
		makeRecommendation();
	} catch (error) {
		if (disposed || version !== clothesVersion) return;
		clothes.value = [];
		outfit.value = null;
		clothesLoading.value = false;
		clothesError.value = "衣橱读取失败，请重试。";
	}
}

function shuffled(items) {
	const result = items.slice();
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(Math.random() * (index + 1));
		[result[index], result[other]] = [result[other], result[index]];
	}
	return result;
}

function outfitKey(value) {
	return ["top", "bottom", "shoes", "accessory"]
		.map((key) => {
			const item = value && value[key];
			return item ? String(item.id) : "";
		})
		.join("|");
}

function makeRecommendation(change = false) {
	if (!canRecommend.value) {
		outfit.value = null;
		return;
	}
	recommendError.value = "";
	changeMessage.value = "";
	try {
		const previous = outfitKey(outfit.value);
		let next;
		for (let attempt = 0; attempt < (change ? 10 : 1); attempt++) {
			if (change) recommendationSeed += 1;
			next = recommendOutfit(
				shuffled(clothes.value),
				recommendationTemperature.value,
				{ seed: recommendationSeed },
			);
			if (
				!next ||
				typeof next !== "object" ||
				!Array.isArray(next.missing)
			)
				throw new Error("invalid outfit");
			if (!change || outfitKey(next) !== previous) break;
		}
		outfit.value = next;
		if (change && outfitKey(next) === previous)
			changeMessage.value =
				"暂时没有找到不同的搭配，可以添加更多单品试试。";
	} catch (error) {
		outfit.value = null;
		recommendError.value = "暂时无法生成搭配，请稍后重试。";
	}
}

function changeOutfit() {
	makeRecommendation(true);
}

function recordWeather() {
	if (!forecast.value)
		return `${formatTemperature(manualTemperature.value)}°C`;
	const day = forecast.value.days[selectedDay.value];
	return `${weatherLabel(day.code)} ${formatTemperature(day.max)}°/${formatTemperature(day.min)}°`;
}

function writeRecord(date) {
	try {
		saveOutfitLog({
			date,
			itemIds: outfitSlots.value
				.filter((slot) => slot.item)
				.map((slot) => slot.item.id),
			weather: recordWeather(),
		});
		uni.showToast({
			title: selectedDay.value === 0 ? "已记入日记" : "已排进计划",
			icon: "success",
		});
	} catch (error) {
		uni.showToast({ title: "保存失败，请重试", icon: "none" });
	}
}

function recordOutfit() {
	const date = forecast.value
		? forecast.value.days[selectedDay.value].date
		: addDays(formatDate(new Date()), selectedDay.value);
	let exists;
	try {
		exists = getOutfitLogs().some((log) => log.date === date);
	} catch (error) {
		uni.showToast({ title: "日记读取失败", icon: "none" });
		return;
	}
	if (!exists) {
		writeRecord(date);
		return;
	}
	uni.showModal({
		title: "这一天已有记录",
		content: "要用这套搭配替换当天的单品吗？照片和备注会保留。",
		confirmText: "替换",
		confirmColor: "#82917c",
		success(result) {
			if (result.confirm) writeRecord(date);
		},
	});
}

function cleanup() {
	if (disposed) return;
	disposed = true;
	weatherVersion += 1;
	clothesVersion += 1;
	if (activeRequest) activeRequest.abort();
	activeRequest = null;
}

onShow(() => {
	loadClothes();
	if (!started) {
		started = true;
		// 已选过城市时直接使用，不再弹定位授权。
		const city = savedCity();
		if (city) selectCity(city);
		else loadLocation();
	}
});
onUnload(cleanup);
onBeforeUnmount(cleanup);
</script>

<style scoped>
.recommend-page {
	min-height: 100vh;
	box-sizing: border-box;
	padding: 48rpx 32rpx 56rpx;
	background: #f8f6f2;
	color: #4c4845;
}
.hero {
	padding: 18rpx 4rpx 40rpx;
}
.hero-eyebrow,
.small-eyebrow {
	display: block;
	color: #b69d91;
	font-size: 19rpx;
	letter-spacing: 4rpx;
	font-weight: 600;
}
.hero-title {
	display: block;
	margin-top: 18rpx;
	font-size: 46rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: #48413d;
}
.hero-subtitle {
	display: block;
	margin-top: 15rpx;
	color: #a49b95;
	font-size: 25rpx;
}
.weather-card,
.outfit-card,
.empty-card {
	background: #fff;
	border: 1rpx solid #f0e9e3;
	border-radius: 26rpx;
	box-shadow: 0 10rpx 35rpx rgba(107, 87, 72, 0.04);
}
.weather-card {
	padding: 30rpx;
}
.section-heading,
.outfit-heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.heading-copy {
	display: flex;
	flex-direction: column;
}
.section-name {
	margin-top: 8rpx;
	font-size: 32rpx;
	font-weight: 600;
	color: #514842;
}
.weather-mark {
	color: #d7bca9;
	font-size: 52rpx;
}
.weather-hint,
.input-help,
.source-note {
	display: block;
	color: #a89d96;
	font-size: 21rpx;
	line-height: 1.6;
}
.weather-hint {
	margin: 20rpx 0;
}
.notice {
	margin: 20rpx 0;
	padding: 20rpx;
	border-radius: 16rpx;
	background: #f8f5f1;
	font-size: 24rpx;
	line-height: 1.6;
	color: #8e7c71;
}
.notice-error {
	background: #fbf3ef;
	color: #a47668;
}
.notice-actions {
	display: flex;
	gap: 20rpx;
	margin-top: 8rpx;
}
button {
	margin: 0;
	padding: 0;
	border: 0;
	line-height: normal;
}
button::after {
	border: 0;
}
.text-button {
	display: inline-block;
	background: transparent;
	color: #a9796a;
	font-size: 23rpx;
	text-align: left;
}
.day-grid {
	display: flex;
	gap: 16rpx;
}
.day-tile {
	flex: 1;
	min-width: 0;
	padding: 22rpx;
	border: 1rpx solid #eee9e4;
	border-radius: 18rpx;
	background: #faf9f7;
	text-align: left;
	color: #716961;
}
.day-tile.selected {
	border-color: #d8b7a7;
	background: #fbf4ef;
}
.day-top {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	font-size: 24rpx;
}
.day-date {
	color: #b2a69e;
	font-size: 19rpx;
}
.day-weather {
	display: block;
	margin-top: 20rpx;
	font-size: 23rpx;
	color: #a68d80;
}
.day-temperature {
	display: block;
	margin-top: 8rpx;
	font-size: 36rpx;
	color: #5b514b;
}
.day-low {
	font-size: 24rpx;
	color: #b0a49c;
}
.source-note {
	margin-top: 14rpx;
}
.manual-summary {
	padding: 22rpx;
	border-radius: 18rpx;
	background: #fbf4ef;
}
.manual-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 25rpx;
}
.manual-value {
	font-size: 34rpx;
	color: #a9796a;
}
.manual-days {
	display: flex;
	gap: 14rpx;
	margin-top: 18rpx;
}
.pill {
	padding: 10rpx 24rpx;
	border-radius: 30rpx;
	background: #fff;
	color: #a69b94;
	font-size: 22rpx;
}
.pill.active {
	background: #d7b8a9;
	color: #fff;
}
.divider {
	height: 1rpx;
	margin: 28rpx 0;
	background: #f1ece8;
}
.location-button {
	width: 100%;
	padding: 18rpx;
	border: 1rpx solid #e8d8cf;
	border-radius: 14rpx;
	background: #fffaf7;
	color: #9e7767;
	font-size: 24rpx;
}
.location-button[disabled] {
	opacity: 0.55;
}
.input-section {
	margin-top: 26rpx;
}
.input-label {
	display: block;
	margin-bottom: 12rpx;
	font-size: 23rpx;
	color: #82746c;
}
.coordinate-row {
	display: flex;
	gap: 10rpx;
	align-items: center;
}
.soft-input {
	flex: 1;
	min-width: 0;
	height: 68rpx;
	box-sizing: border-box;
	padding: 0 16rpx;
	border: 1rpx solid #eee8e2;
	border-radius: 12rpx;
	background: #faf9f7;
	font-size: 23rpx;
}
.placeholder {
	color: #c5bbb4;
	font-size: 21rpx;
}
.small-button {
	flex-shrink: 0;
	padding: 0 18rpx;
	height: 68rpx;
	border-radius: 12rpx;
	background: #e8d3c8;
	color: #775c50;
	font-size: 22rpx;
	line-height: 68rpx;
}
.input-help {
	margin-top: 9rpx;
}
.outfit-heading {
	margin: 46rpx 4rpx 0;
}
.change-button {
	padding: 15rpx 22rpx;
	border-radius: 30rpx;
	background: #efe2da;
	color: #9d7869;
	font-size: 23rpx;
}
.change-button[disabled] {
	opacity: 0.5;
	color: #a89a92;
}
.outfit-description {
	display: block;
	margin: 15rpx 4rpx 22rpx;
	color: #aa9d95;
	font-size: 23rpx;
	line-height: 1.5;
}
.outfit-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 18rpx;
}
.outfit-card {
	width: calc(50% - 9rpx);
	box-sizing: border-box;
	overflow: hidden;
}
.item-image-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 240rpx;
	background: #f3efeb;
}
.item-image {
	width: 100%;
	height: 100%;
}
.item-placeholder {
	color: #d5c6bc;
	font-size: 58rpx;
	font-weight: 300;
}
.item-info {
	padding: 20rpx;
}
.item-category {
	display: block;
	color: #b49b8d;
	font-size: 21rpx;
}
.item-name {
	display: block;
	margin-top: 8rpx;
	color: #625851;
	font-size: 25rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.empty-card {
	padding: 50rpx 25rpx;
	text-align: center;
	color: #a89b92;
	font-size: 24rpx;
	line-height: 1.7;
}
.retry-clothes {
	display: block;
	margin: 15rpx auto 0;
	text-align: center;
}
.missing-note,
.change-note {
	margin: 20rpx 4rpx 0;
	color: #ad8d7e;
	font-size: 23rpx;
	line-height: 1.6;
}
.footer-note {
	margin-top: 50rpx;
	text-align: center;
	color: #c4b8af;
	font-size: 21rpx;
	letter-spacing: 2rpx;
}
.city-search {
	display: block;
	width: 100%;
}
.city-list {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 14rpx;
}
.city-pill {
	background: #faf9f7;
	color: #8d7f76;
}
.source-link,
.more-link {
	color: #9e7767;
}
.more-link {
	display: block;
	font-size: 22rpx;
}
.record-button {
	margin: 24rpx 0 0;
	border-radius: 14rpx;
	background: #7d8f78;
	color: #fff;
	font-size: 27rpx;
	line-height: 84rpx;
}
.record-button::after {
	border: 0;
}
</style>
