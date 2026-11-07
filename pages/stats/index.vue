<template>
	<view class="stats-page page-shell">
		<view v-if="loadError" class="card empty">
			<text>数据读取失败，请重试。</text>
			<button class="text-button" @click="refresh">重新读取</button>
		</view>
		<block v-else-if="stats">
			<view class="overview">
				<view class="overview-tile">
					<text class="tile-value">{{ stats.monthDays }}</text>
					<text class="tile-label">本月记录天数</text>
				</view>
				<view class="overview-tile">
					<text class="tile-value">{{ stats.streak }}</text>
					<text class="tile-label">连续记录天数</text>
				</view>
				<view class="overview-tile">
					<text class="tile-value"
						>{{ stats.wornItems }}/{{ stats.totalItems }}</text
					>
					<text class="tile-label">穿过的单品</text>
				</view>
				<view class="overview-tile">
					<text class="tile-value">¥{{ money(stats.totalValue) }}</text>
					<text class="tile-label">已填价格的总价值</text>
				</view>
			</view>

			<view v-for="section in sections" :key="section.title">
				<view class="section-heading">
					<text class="section-en">{{ section.eyebrow }}</text>
					<text class="section-title">{{ section.title }}</text>
					<text class="section-note">{{ section.note }}</text>
				</view>
				<view class="card">
					<view
						v-for="(row, index) in section.rows"
						:key="row.item.id"
						class="stat-row"
					>
						<text class="rank">{{ index + 1 }}</text>
						<image
							v-if="row.item.photo"
							class="thumb"
							:src="row.item.photo"
							mode="aspectFill"
						/>
						<view v-else class="thumb thumb-mark">衣</view>
						<view class="row-copy">
							<text class="row-name">{{ row.item.name }}</text>
							<text class="row-meta">{{ row.item.category }}</text>
						</view>
						<text class="row-value">{{ section.value(row) }}</text>
					</view>
					<text v-if="!section.rows.length" class="section-empty">{{
						section.empty
					}}</text>
				</view>
			</view>
		</block>
		<view class="footer">穿过的才算真正拥有。</view>
	</view>
</template>

<script>
import { getClothes, getOutfitLogs } from "@/utils/storage.js";
import {
	IDLE_DAYS,
	buildWardrobeStats,
	formatDate,
	formatMoney,
} from "@/utils/outfitStats.js";

export default {
	data() {
		return { stats: null, loadError: false };
	},
	computed: {
		sections() {
			return [
				{
					eyebrow: "MOST WORN",
					title: "最常穿",
					note: "只统计今天及以前的记录",
					rows: this.stats.mostWorn,
					value: (row) => `${row.count} 次`,
					empty: "还没有穿着记录，去日记里记下今天吧。",
				},
				{
					eyebrow: "BEST VALUE",
					title: "单次成本最低",
					note: "购买价格 ÷ 穿着次数",
					rows: this.stats.bestValue,
					value: (row) => `¥${formatMoney(row.cost)}/次`,
					empty: "给穿过的衣物填上购买价格后，这里会出现排行。",
				},
				{
					eyebrow: "WAITING FOR YOU",
					title: "闲置单品",
					note: `超过 ${IDLE_DAYS} 天没穿`,
					rows: this.stats.idle,
					value: (row) => `${row.idleDays} 天`,
					empty: "没有闲置的单品，每一件都被好好穿着。",
				},
			];
		},
	},
	onShow() {
		this.refresh();
	},
	methods: {
		money: formatMoney,
		refresh() {
			try {
				this.stats = buildWardrobeStats(
					getClothes(),
					getOutfitLogs(),
					formatDate(new Date()),
				);
				this.loadError = false;
			} catch (error) {
				this.loadError = true;
			}
		},
	},
};
</script>

<style scoped>
.stats-page {
	min-height: 100vh;
	padding: 32rpx 32rpx 60rpx;
	background: #f8f7f2;
}
.overview {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16rpx;
}
.overview-tile {
	padding: 26rpx 24rpx;
	border-radius: 18rpx;
	background: #e9eee5;
}
.tile-value,
.tile-label,
.section-en,
.section-title,
.section-note,
.row-name,
.row-meta,
.section-empty {
	display: block;
}
.tile-value {
	overflow: hidden;
	color: #40503f;
	font-size: 38rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.tile-label {
	margin-top: 8rpx;
	color: #92a08e;
	font-size: 21rpx;
}
.section-heading {
	margin: 40rpx 0 18rpx;
}
.section-en {
	color: #a0ad9b;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.section-title {
	margin-top: 8rpx;
	color: #404b3e;
	font-family: serif;
	font-size: 32rpx;
	font-weight: 600;
}
.section-note {
	margin-top: 6rpx;
	color: #a7aa9e;
	font-size: 21rpx;
}
.card {
	overflow: hidden;
	border: 1rpx solid #eeece4;
	border-radius: 18rpx;
	background: #fffdfa;
}
.empty {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx;
	color: #aa7c72;
	font-size: 23rpx;
}
.text-button {
	margin: 0;
	padding: 0;
	background: transparent;
	color: #6e836b;
	font-size: 23rpx;
}
.text-button::after {
	border: 0;
}
.stat-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 18rpx 24rpx;
}
.stat-row + .stat-row {
	border-top: 1rpx solid #f0efe9;
}
.rank {
	width: 28rpx;
	color: #b6bfb1;
	font-family: serif;
	font-size: 26rpx;
	text-align: center;
}
.thumb {
	flex-shrink: 0;
	width: 76rpx;
	height: 76rpx;
	border-radius: 10rpx;
}
.thumb-mark {
	background: #efece4;
	color: #b9b4a6;
	font-family: serif;
	font-size: 28rpx;
	line-height: 76rpx;
	text-align: center;
}
.row-copy {
	flex: 1;
	min-width: 0;
}
.row-name {
	overflow: hidden;
	color: #52604f;
	font-size: 26rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.row-meta {
	margin-top: 4rpx;
	color: #a7aa9e;
	font-size: 21rpx;
}
.row-value {
	flex-shrink: 0;
	color: #6e836b;
	font-size: 25rpx;
}
.section-empty {
	padding: 30rpx 24rpx;
	color: #a7aa9e;
	font-size: 23rpx;
	line-height: 1.6;
}
.footer {
	margin-top: 44rpx;
	color: #b5b7ac;
	font-size: 21rpx;
	text-align: center;
}
</style>
