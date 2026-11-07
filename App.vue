<script>
import { getSettings } from "@/utils/storage.js";
import {
	getTodayFestival,
	wasFestivalShown,
	markFestivalShown,
} from "@/utils/festival.js";

let reminderOpen = false;

export default {
	onShow() {
		if (reminderOpen) return;
		try {
			const date = new Date();
			const festival = getTodayFestival(date);
			if (
				!festival ||
				!getSettings().festivalReminder ||
				wasFestivalShown(date)
			)
				return;
			reminderOpen = true;
			uni.showModal({
				title: `今天是${festival.name}`,
				content: festival.message,
				showCancel: false,
				confirmText: "好呀",
				confirmColor: "#7f907a",
				success() {
					try {
						markFestivalShown(date);
					} catch (error) {
						console.warn("无法保存节日提醒记录", error);
					}
				},
				complete() {
					reminderOpen = false;
				},
			});
		} catch (error) {
			reminderOpen = false;
			console.warn("节日提醒暂不可用", error);
		}
	},
};
</script>

<style>
page {
	background: #f8f7f2;
	color: #424a40;
	font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
}
button::after {
	border: 0;
}
.page-shell {
	box-sizing: border-box;
}
.muted {
	color: #a7ad9f;
}
</style>
