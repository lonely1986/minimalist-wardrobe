<template>
	<view class="mine-page page-shell">
		<view class="hero">
			<text class="eyebrow">A MOMENT FOR YOURSELF</text>
			<text class="hero-title">留一点时间给自己</text>
			<text class="hero-subtitle">衣伴，陪你温柔地过每一天。</text>
			<view class="seal"
				><text>衣</text><text class="seal-bottom">伴</text></view
			>
		</view>
		<view class="section-heading"
			><text class="section-en">PREFERENCES</text
			><text class="section-title">偏好设置</text></view
		>
		<view class="settings-card">
			<view class="setting-row">
				<view class="setting-copy"
					><text class="row-title">节日轻提醒</text
					><text class="row-description"
						>在特别的日子，送你一点小小的仪式感</text
					></view
				>
				<switch
					:checked="festivalReminder"
					:disabled="settingsError"
					color="#82917c"
					@change="changeReminder"
				/>
			</view>
			<view v-if="settingsError" class="error-row"
				><text>设置读取失败，请重试。</text
				><button class="retry" @click="loadSettings">
					重新读取
				</button></view
			>
		</view>
		<view class="section-heading"
			><text class="section-en">YOUR SPACE</text
			><text class="section-title">我的空间</text></view
		>
		<view class="settings-card">
			<view class="setting-row actionable" @click="confirmClear">
				<view class="setting-copy"
					><text class="row-title">清空衣物缓存</text
					><text class="row-description"
						>删除保存在本机的衣物与照片，不影响设置</text
					></view
				><text class="arrow">›</text>
			</view>
			<view class="separator"></view>
			<view class="setting-row actionable" @click="showAbout">
				<view class="setting-copy"
					><text class="row-title">关于衣伴</text
					><text class="row-description">关于这个小小衣橱</text></view
				><text class="arrow">›</text>
			</view>
		</view>
		<view class="privacy-note"
			>衣物数据仅保存在当前设备，清除小程序数据或更换设备后可能丢失。</view
		>
		<view class="footer"
			>— &nbsp; 愿每个平常日子，都有温柔相伴 &nbsp; —</view
		>
	</view>
</template>

<script>
import { getSettings, saveSettings, clearClothes } from "@/utils/storage.js";

export default {
	data() {
		return {
			festivalReminder: true,
			settingsError: false,
			clearing: false,
			alive: true,
		};
	},
	onShow() {
		this.loadSettings();
	},
	onUnload() {
		this.alive = false;
	},
	methods: {
		loadSettings() {
			try {
				this.festivalReminder = getSettings().festivalReminder;
				this.settingsError = false;
			} catch (error) {
				this.settingsError = true;
			}
		},
		changeReminder(event) {
			const previous = this.festivalReminder;
			try {
				this.festivalReminder = saveSettings({
					festivalReminder: event.detail.value,
				}).festivalReminder;
			} catch (error) {
				// 重新渲染 switch，避免原生控件停留在未保存状态。
				this.festivalReminder = event.detail.value;
				this.$nextTick(() => {
					this.festivalReminder = previous;
				});
				uni.showToast({ title: "设置保存失败，请重试", icon: "none" });
			}
		},
		confirmClear() {
			if (this.clearing) return;
			this.clearing = true;
			uni.showModal({
				title: "清空衣物缓存？",
				content: "此操作将删除本机的全部衣物记录和照片，无法恢复。",
				confirmText: "清空",
				confirmColor: "#a77970",
				success: (result) => {
					if (!this.alive || !result.confirm) return;
					try {
						clearClothes();
						uni.$emit("clothes-changed");
						uni.showToast({ title: "衣物已清空", icon: "success" });
					} catch (error) {
						uni.showToast({
							title: "清空失败，请重试",
							icon: "none",
						});
					}
				},
				complete: () => {
					if (this.alive) this.clearing = false;
				},
			});
		},
		showAbout() {
			uni.showModal({
				title: "关于衣伴",
				content:
					"衣伴是一座随身的小衣橱。整理四季衣物，看看天气，让穿搭与日常都多一分从容。\n\n天气数据由 Open-Meteo 提供。衣物数据保存在本机。",
				showCancel: false,
				confirmText: "知道了",
				confirmColor: "#82917c",
			});
		},
	},
};
</script>

<style scoped>
.mine-page {
	min-height: 100vh;
	padding: 38rpx 32rpx 60rpx;
	background: #f8f7f2;
}
.hero {
	position: relative;
	overflow: hidden;
	padding: 42rpx 36rpx;
	border-radius: 22rpx;
	background: #e9eee5;
}
.eyebrow,
.hero-title,
.hero-subtitle,
.section-en,
.section-title,
.row-title,
.row-description {
	display: block;
}
.eyebrow,
.section-en {
	color: #a0ad9b;
	font-size: 17rpx;
	letter-spacing: 3rpx;
}
.hero-title {
	margin-top: 20rpx;
	color: #40503f;
	font-family: serif;
	font-size: 41rpx;
	font-weight: 600;
}
.hero-subtitle {
	margin-top: 15rpx;
	color: #92a08e;
	font-size: 22rpx;
}
.seal {
	position: absolute;
	right: 36rpx;
	top: 38rpx;
	padding: 8rpx 10rpx;
	border: 1rpx solid #b1bdaa;
	color: #9cae98;
	font-family: serif;
	font-size: 22rpx;
	line-height: 1.4;
}
.seal-bottom {
	display: block;
}
.section-heading {
	margin: 42rpx 0 20rpx;
}
.section-title {
	margin-top: 8rpx;
	color: #404b3e;
	font-family: serif;
	font-size: 33rpx;
	font-weight: 600;
}
.settings-card {
	overflow: hidden;
	border: 1rpx solid #eeece4;
	border-radius: 18rpx;
	background: #fffdfa;
}
.setting-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	padding: 28rpx;
}
.setting-copy {
	flex: 1;
	min-width: 0;
}
.row-title {
	color: #52604f;
	font-size: 27rpx;
}
.row-description {
	margin-top: 9rpx;
	color: #a7aa9e;
	font-size: 21rpx;
	line-height: 1.6;
}
.separator {
	height: 1rpx;
	margin: 0 28rpx;
	background: #f0efe9;
}
.arrow {
	color: #b6bfb1;
	font-size: 40rpx;
}
.error-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 28rpx 24rpx;
	color: #aa7c72;
	font-size: 22rpx;
}
.retry {
	margin: 0;
	padding: 0;
	color: #82917c;
	background: transparent;
	font-size: 22rpx;
}
.privacy-note {
	margin: 28rpx 6rpx 0;
	color: #a5aa9d;
	font-size: 21rpx;
	line-height: 1.8;
}
.footer {
	padding-top: 80rpx;
	color: #c2c3b9;
	font-size: 20rpx;
	text-align: center;
}
</style>
