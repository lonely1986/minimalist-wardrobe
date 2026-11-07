<template>
	<view class="diary-page page-shell">
		<view class="hero">
			<text class="eyebrow">OUTFIT DIARY</text>
			<text class="hero-title">把每天穿过的自己，留下来</text>
			<view class="hero-stats">
				<view class="hero-stat">
					<text class="stat-value">{{ monthDays }}</text>
					<text class="stat-label">本月记录</text>
				</view>
				<view class="hero-stat">
					<text class="stat-value">{{ streak }}</text>
					<text class="stat-label">连续天数</text>
				</view>
				<button class="stats-link" @click="goStats">穿着统计 ›</button>
			</view>
		</view>

		<view v-if="loadError" class="card notice">
			<text>穿搭日记读取失败，请重试。</text>
			<button class="text-button" @click="refresh">重新读取</button>
		</view>

		<view class="card calendar">
			<view class="month-bar">
				<button class="month-button" aria-label="上个月" @click="shiftMonth(-1)">
					‹
				</button>
				<text class="month-title">{{ year }} 年 {{ month + 1 }} 月</text>
				<button class="month-button" aria-label="下个月" @click="shiftMonth(1)">
					›
				</button>
			</view>
			<view class="week-row">
				<text v-for="name in weekNames" :key="name" class="week-name">{{
					name
				}}</text>
			</view>
			<view class="day-grid">
				<view
					v-for="cell in cells"
					:key="cell.key"
					class="day-cell"
					:class="{
						blank: !cell.date,
						today: cell.isToday,
						active: cell.date && cell.date === selectedDate,
					}"
					@click="cell.date && selectDate(cell.date)"
				>
					<image
						v-if="cell.photo"
						class="day-photo"
						:src="cell.photo"
						mode="aspectFill"
					/>
					<text class="day-number" :class="{ onPhoto: cell.photo }">{{
						cell.day
					}}</text>
					<view
						v-if="cell.hasLog && !cell.photo"
						class="day-dot"
						:class="{ planned: cell.isFuture }"
					></view>
				</view>
			</view>
			<view class="legend">
				<view class="legend-dot"></view><text>已记录</text>
				<view class="legend-dot planned"></view><text>计划</text>
			</view>
		</view>

		<view class="card day-card">
			<view class="day-heading">
				<view>
					<text class="day-title">{{ selectedLabel }}</text>
					<text v-if="selectedLog" class="day-tag">{{
						isPlanned ? "计划" : "已记录"
					}}</text>
				</view>
				<text
					v-if="selectedLog && selectedLog.weather"
					class="day-weather"
					>{{ selectedLog.weather }}</text
				>
			</view>

			<block v-if="selectedLog">
				<image
					v-if="selectedLog.photo"
					class="log-photo"
					:src="selectedLog.photo"
					mode="aspectFill"
				/>
				<view v-if="selectedItems.length" class="log-items">
					<view
						v-for="item in selectedItems"
						:key="item.id"
						class="log-item"
					>
						<image
							v-if="item.photo"
							class="log-thumb"
							:src="item.photo"
							mode="aspectFill"
						/>
						<view v-else class="log-thumb log-mark">衣</view>
						<text class="log-name">{{ item.name }}</text>
						<text class="log-category">{{ item.category }}</text>
					</view>
				</view>
				<text v-if="missingCount" class="log-missing"
					>另有 {{ missingCount }} 件单品已从衣橱删除</text
				>
				<text v-if="selectedLog.occasion" class="log-occasion">{{
					selectedLog.occasion
				}}</text>
				<text v-if="selectedLog.note" class="log-note">{{
					selectedLog.note
				}}</text>
				<view class="log-actions">
					<button class="ghost-button" @click="openForm">编辑</button>
					<button class="ghost-button danger" @click="confirmDelete">
						删除
					</button>
				</view>
			</block>
			<block v-else>
				<text class="day-empty">{{
					isPlanned
						? "提前想好穿什么，那天早上就从容一点。"
						: "这一天还没有记录。"
				}}</text>
				<button class="primary-button" @click="openForm">
					{{ isPlanned ? "计划这一天" : "记录这一天" }}
				</button>
			</block>
		</view>

		<OutfitLogForm
			v-if="formOpen"
			:date="selectedDate"
			:date-label="selectedLabel"
			:planned="isPlanned"
			:log="selectedLog"
			:clothes="clothes"
			@close="formOpen = false"
			@saved="onSaved"
		/>
	</view>
</template>

<script>
import OutfitLogForm from "@/components/OutfitLogForm.vue";
import {
	getClothes,
	getOutfitLogs,
	deleteOutfitLog,
} from "@/utils/storage.js";
import { formatDate, recordStreak } from "@/utils/outfitStats.js";

const WEEK_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

export default {
	components: { OutfitLogForm },
	data() {
		const now = new Date();
		return {
			weekNames: WEEK_NAMES,
			year: now.getFullYear(),
			month: now.getMonth(),
			today: formatDate(now),
			selectedDate: formatDate(now),
			logs: [],
			clothes: [],
			loadError: false,
			formOpen: false,
		};
	},
	computed: {
		logMap() {
			return Object.fromEntries(this.logs.map((log) => [log.date, log]));
		},
		cells() {
			// 周一为每周第一天，前面用空格补齐。
			const offset = (new Date(this.year, this.month, 1).getDay() + 6) % 7;
			const total = new Date(this.year, this.month + 1, 0).getDate();
			const cells = Array.from({ length: offset }, (_, index) => ({
				key: `blank-${index}`,
			}));
			for (let day = 1; day <= total; day++) {
				const date = formatDate(new Date(this.year, this.month, day));
				const log = this.logMap[date];
				cells.push({
					key: date,
					date,
					day,
					hasLog: !!log,
					photo: log ? log.photo : "",
					isToday: date === this.today,
					isFuture: date > this.today,
				});
			}
			return cells;
		},
		monthDays() {
			const month = this.today.slice(0, 7);
			return this.logs.filter(
				(log) => log.date.startsWith(month) && log.date <= this.today,
			).length;
		},
		streak() {
			return recordStreak(this.logs, this.today);
		},
		isPlanned() {
			return this.selectedDate > this.today;
		},
		selectedLog() {
			return this.logMap[this.selectedDate] || null;
		},
		selectedItems() {
			if (!this.selectedLog) return [];
			return this.clothes.filter((item) =>
				this.selectedLog.itemIds.includes(item.id),
			);
		},
		missingCount() {
			return this.selectedLog
				? this.selectedLog.itemIds.length - this.selectedItems.length
				: 0;
		},
		selectedLabel() {
			const [year, month, day] = this.selectedDate.split("-").map(Number);
			const week = new Date(year, month - 1, day).getDay();
			const name = WEEK_NAMES[(week + 6) % 7];
			const suffix = this.selectedDate === this.today ? " · 今天" : "";
			return `${month} 月 ${day} 日 周${name}${suffix}`;
		},
	},
	onShow() {
		this.today = formatDate(new Date());
		this.refresh();
	},
	methods: {
		refresh() {
			try {
				this.logs = getOutfitLogs();
				this.clothes = getClothes();
				this.loadError = false;
			} catch (error) {
				this.loadError = true;
			}
		},
		shiftMonth(step) {
			const next = new Date(this.year, this.month + step, 1);
			this.year = next.getFullYear();
			this.month = next.getMonth();
		},
		selectDate(date) {
			this.selectedDate = date;
		},
		openForm() {
			if (!this.loadError) this.formOpen = true;
		},
		onSaved() {
			this.formOpen = false;
			this.refresh();
			uni.showToast({ title: "已保存", icon: "success" });
		},
		goStats() {
			uni.navigateTo({ url: "/pages/stats/index" });
		},
		confirmDelete() {
			const date = this.selectedDate;
			uni.showModal({
				title: "删除这条记录？",
				content: "当天的照片和备注也会一起删除，无法恢复。",
				confirmText: "删除",
				confirmColor: "#a77970",
				success: (result) => {
					if (!result.confirm) return;
					try {
						deleteOutfitLog(date);
						this.refresh();
						uni.showToast({ title: "已删除", icon: "success" });
					} catch (error) {
						uni.showToast({
							title: "删除失败，请重试",
							icon: "none",
						});
					}
				},
			});
		},
	},
};
</script>

<style scoped>
.diary-page {
	min-height: 100vh;
	padding: 38rpx 32rpx 60rpx;
	background: #f8f7f2;
}
.hero {
	padding: 38rpx 36rpx 32rpx;
	border-radius: 22rpx;
	background: #e9eee5;
}
.eyebrow,
.hero-title,
.stat-value,
.stat-label,
.day-empty,
.log-missing,
.log-note {
	display: block;
}
.eyebrow {
	color: #a0ad9b;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.hero-title {
	margin-top: 18rpx;
	color: #40503f;
	font-family: serif;
	font-size: 37rpx;
	font-weight: 600;
}
.hero-stats {
	display: flex;
	align-items: flex-end;
	gap: 44rpx;
	margin-top: 26rpx;
}
.stat-value {
	color: #50604e;
	font-size: 40rpx;
	line-height: 1.1;
}
.stat-label {
	margin-top: 6rpx;
	color: #92a08e;
	font-size: 21rpx;
}
.stats-link,
.text-button {
	margin: 0 0 0 auto;
	padding: 0;
	background: transparent;
	color: #6e836b;
	font-size: 23rpx;
	line-height: 1.6;
}
.stats-link::after,
.text-button::after,
.month-button::after,
.ghost-button::after,
.primary-button::after {
	border: 0;
}
.card {
	margin-top: 24rpx;
	border: 1rpx solid #eeece4;
	border-radius: 18rpx;
	background: #fffdfa;
}
.notice {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 28rpx;
	color: #aa7c72;
	font-size: 23rpx;
}
.calendar {
	padding: 22rpx 20rpx 24rpx;
}
.month-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.month-title {
	color: #404b3e;
	font-family: serif;
	font-size: 30rpx;
	font-weight: 600;
}
.month-button {
	margin: 0;
	padding: 0;
	width: 72rpx;
	height: 60rpx;
	background: transparent;
	color: #82917c;
	font-size: 40rpx;
	line-height: 56rpx;
}
.week-row,
.day-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
}
.week-row {
	margin-top: 12rpx;
}
.week-name {
	color: #a7aa9e;
	font-size: 21rpx;
	line-height: 48rpx;
	text-align: center;
}
.day-grid {
	gap: 6rpx;
}
.day-cell {
	position: relative;
	box-sizing: border-box;
	height: 84rpx;
	overflow: hidden;
	border: 2rpx solid transparent;
	border-radius: 14rpx;
}
.day-cell.today {
	background: #f0f3ec;
}
.day-cell.active {
	border-color: #7d8f78;
}
.day-photo {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.day-number {
	position: relative;
	display: block;
	color: #5c6658;
	font-size: 24rpx;
	line-height: 58rpx;
	text-align: center;
}
.day-number.onPhoto {
	color: #fff;
	text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.55);
}
.day-dot,
.legend-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #7d8f78;
}
.day-dot {
	position: absolute;
	left: 50%;
	bottom: 10rpx;
	margin-left: -5rpx;
}
.day-dot.planned,
.legend-dot.planned {
	background: #d2b7a8;
}
.legend {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10rpx;
	margin-top: 14rpx;
	color: #a7aa9e;
	font-size: 20rpx;
}
.legend-dot.planned {
	margin-left: 16rpx;
}
.day-card {
	padding: 28rpx;
}
.day-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}
.day-title {
	color: #404b3e;
	font-family: serif;
	font-size: 30rpx;
	font-weight: 600;
}
.day-tag {
	margin-left: 12rpx;
	padding: 3rpx 12rpx;
	border-radius: 16rpx;
	background: #e8eee5;
	color: #61745f;
	font-size: 19rpx;
}
.day-weather {
	flex-shrink: 0;
	color: #a7aa9e;
	font-size: 21rpx;
}
.day-empty {
	margin: 22rpx 0 24rpx;
	color: #a7aa9e;
	font-size: 23rpx;
}
.primary-button {
	margin: 0;
	border-radius: 12rpx;
	background: #7d8f78;
	color: #fff;
	font-size: 26rpx;
	line-height: 78rpx;
}
.log-photo {
	display: block;
	width: 100%;
	height: 420rpx;
	margin-top: 20rpx;
	border-radius: 14rpx;
}
.log-items {
	margin-top: 16rpx;
}
.log-item {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 10rpx 0;
}
.log-thumb {
	flex-shrink: 0;
	width: 72rpx;
	height: 72rpx;
	border-radius: 10rpx;
}
.log-mark {
	background: #efece4;
	color: #b9b4a6;
	font-family: serif;
	font-size: 28rpx;
	line-height: 72rpx;
	text-align: center;
}
.log-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	color: #52604f;
	font-size: 25rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.log-category,
.log-missing {
	color: #a7aa9e;
	font-size: 21rpx;
}
.log-missing {
	margin-top: 8rpx;
}
.log-occasion {
	display: inline-block;
	margin-top: 16rpx;
	padding: 6rpx 18rpx;
	border-radius: 24rpx;
	background: #f3efe8;
	color: #8d8474;
	font-size: 21rpx;
}
.log-note {
	margin-top: 16rpx;
	color: #5c6658;
	font-size: 25rpx;
	line-height: 1.7;
	white-space: pre-wrap;
}
.log-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 24rpx;
}
.ghost-button {
	flex: 1;
	margin: 0;
	border-radius: 12rpx;
	background: #f0f1ea;
	color: #6e7d69;
	font-size: 24rpx;
	line-height: 70rpx;
}
.ghost-button.danger {
	color: #a77970;
}
</style>
