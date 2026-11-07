<template>
	<view class="clothing-card card">
		<view class="photo-wrap" @click="$emit('edit', item)">
			<image
				v-if="item.photo && !imageFailed"
				class="photo"
				:src="item.photo"
				mode="aspectFill"
				@error="imageFailed = true"
			/>
			<view v-else class="photo-placeholder"
				><text class="placeholder-mark">衣</text
				><text>{{
					item.photo ? "图片暂不可用" : "未添加照片"
				}}</text></view
			>
			<view class="category-label">{{ item.category || "衣物" }}</view>
		</view>
		<view class="card-body">
			<view class="title-row"
				><text class="name">{{ item.name || "未命名衣物" }}</text
				><button
					class="favorite"
					:class="{ active: item.favorite }"
					:aria-label="item.favorite ? '取消常穿' : '标记常穿'"
					@click.stop="$emit('favorite', item)"
				>
					{{ item.favorite ? "♥" : "♡" }}
				</button></view
			>
			<text class="details">{{ details }}</text>
			<view class="card-actions"
				><button class="action" @click.stop="$emit('edit', item)">
					编辑</button
				><button
					class="action delete"
					@click.stop="$emit('delete', item)"
				>
					删除
				</button></view
			>
		</view>
	</view>
</template>

<script>
export default {
	name: "ClothingCard",
	props: { item: { type: Object, required: true } },
	emits: ["edit", "delete", "favorite"],
	data() {
		return { imageFailed: false };
	},
	computed: {
		details() {
			const parts = [];
			if (this.item.category === "配饰" && this.item.accessoryType)
				parts.push(this.item.accessoryType);
			if (Array.isArray(this.item.seasons) && this.item.seasons.length)
				parts.push(this.item.seasons.join(" / "));
			if (this.item.color) parts.push(this.item.color);
			return parts.join(" · ") || "留一份心意给日常";
		},
	},
	watch: {
		"item.photo"() {
			this.imageFailed = false;
		},
	},
};
</script>

<style scoped>
.clothing-card {
	min-width: 0;
	overflow: hidden;
	background: #fffdfa;
	border: 1rpx solid #eee8df;
	border-radius: 22rpx;
	box-shadow: 0 8rpx 30rpx rgba(89, 73, 56, 0.05);
}
.photo-wrap {
	position: relative;
	height: 260rpx;
	overflow: hidden;
	background: #eeeae2;
}
.photo {
	width: 100%;
	height: 100%;
	display: block;
}
.photo-placeholder {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	color: #a7a092;
	font-size: 21rpx;
	background: linear-gradient(145deg, #f3f0e9, #e8e5dc);
}
.placeholder-mark {
	font-family: serif;
	font-size: 72rpx;
	color: #c1b9a9;
}
.category-label {
	position: absolute;
	left: 16rpx;
	top: 16rpx;
	padding: 6rpx 16rpx;
	border-radius: 30rpx;
	background: rgba(255, 253, 248, 0.9);
	color: #777564;
	font-size: 20rpx;
}
.card-body {
	padding: 18rpx 20rpx 14rpx;
}
.title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8rpx;
}
.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #393d35;
	font-size: 27rpx;
	font-weight: 600;
}
.favorite {
	flex-shrink: 0;
	margin: 0;
	padding: 0;
	width: 54rpx;
	height: 54rpx;
	line-height: 54rpx;
	background: transparent;
	color: #a9a69b;
	font-size: 40rpx;
}
.favorite.active {
	color: #b77871;
}
.favorite::after,
.action::after {
	border: 0;
}
.details {
	display: block;
	min-height: 33rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: #a29c90;
	font-size: 21rpx;
}
.card-actions {
	display: flex;
	justify-content: flex-end;
	gap: 24rpx;
	margin-top: 12rpx;
	border-top: 1rpx solid #f1ede6;
}
.action {
	margin: 0;
	padding: 10rpx 0 0;
	background: transparent;
	color: #778273;
	font-size: 22rpx;
	line-height: 1.8;
}
.action.delete {
	color: #b29388;
}
@media screen and (max-width: 340px) {
	.photo-wrap {
		height: 210rpx;
	}
	.card-body {
		padding: 14rpx;
	}
}
</style>
