// ==UserScript==
// @name         黄金左右键
// @description  按住"→"键倍速播放, 按住"←"键减速播放, 松开恢复原来的倍速，灵活追剧看视频~ 支持用户单独配置倍速和秒数，并可根据根域名启用或禁用脚本
// @icon         https://image.suysker.xyz/i/2023/10/09/artworks-QOnSW1HR08BDMoe9-GJTeew-t500x500.webp
// @namespace    https://blog.suysker.xyz/
// @version      1.0.0
// @author       Suysker
// @match        http://*/*
// @match        https://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @homepage     https://github.com/Suysker/Golden-Left-Right
// @supportURL   https://github.com/Suysker/Golden-Left-Right
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_RATE = 2;   // 默认倍速
    const DEFAULT_TIME = 5;   // 默认秒数
    const DOMAIN_BLOCK_LIST_KEY = "blockedDomains"; // 存储禁用的根域名列表的键名
    let keyboardEventsRegistered = false; // 确保键盘事件只注册一次
    let debug = false; // 控制日志的输出，正式环境关闭

    const loadSetting = async (key, defaultValue) => {
        const value = await GM_getValue(key, defaultValue);
        return value !== undefined ? value : defaultValue;
    };

    const saveSetting = async (key, value) => {
        await GM_setValue(key, value);
    };

    const log = debug ? console.log.bind(console) : () => {};

    const getRootDomain = () => {
        const parts = location.hostname.split('.');
        return parts.slice(-2).join('.'); // 获取根域名 (例如 example.com)
    };

    const isDomainBlocked = async () => {
        const blockedDomains = await loadSetting(DOMAIN_BLOCK_LIST_KEY, []);
        const currentDomain = getRootDomain();
        return blockedDomains.includes(currentDomain);
    };

    const toggleCurrentDomain = async () => {
        const blockedDomains = await loadSetting(DOMAIN_BLOCK_LIST_KEY, []);
        const currentDomain = getRootDomain();
        const index = blockedDomains.indexOf(currentDomain);
        let isNowBlocked = false;
        if (index === -1) {
            blockedDomains.push(currentDomain);
            await saveSetting(DOMAIN_BLOCK_LIST_KEY, blockedDomains);
            alert(`已禁用黄金左右键脚本在此网站 (${currentDomain})`);
            isNowBlocked = true;
        } else {
            blockedDomains.splice(index, 1);
            await saveSetting(DOMAIN_BLOCK_LIST_KEY, blockedDomains);
            alert(`已启用黄金左右键脚本在此网站 (${currentDomain})`);
            isNowBlocked = false;
        }
        keyboardEventsRegistered = false; // 确保键盘事件重新注册
        handleKeyboardEvents(!isNowBlocked); // 根据新状态立即启用/禁用键盘事件
    };

    const state = {
        downCount: 0,
        playbackRate: DEFAULT_RATE,   // 播放倍速
        changeTime: DEFAULT_TIME,     // 快进/回退秒数
        pageVideo: null,
        lastPlayedVideo: null,        // 记录上一个播放过的视频（通过 play 事件更新）
        originalPlaybackRate: 1       // 存储原来的播放速度
    };

    const isVideoVisible = (video) => {
        const rect = video.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    const isVideoPlaying = (video) => {
        return video && !video.paused && video.currentTime > 0;
    };

    const getAllVideos = () => {
        return Array.from(document.getElementsByTagName('video'));
    };

    const addPlayEventListeners = (video) => {
        video.addEventListener('play', () => {
            state.lastPlayedVideo = video; // 仅在视频播放时更新
            log('更新 lastPlayedVideo: 当前播放的视频', video);
        });
    };

    const initVideoListeners = () => {
        const allVideos = getAllVideos();
        allVideos.forEach(addPlayEventListeners); // 为每个视频添加事件监听
    };

    const getOptimalPageVideo = async () => {
        const allVideos = getAllVideos();

        const playingVideo = allVideos.find(isVideoPlaying);
        if (playingVideo) {
            return playingVideo;
        }

        if (state.lastPlayedVideo && isVideoVisible(state.lastPlayedVideo)) {
            return state.lastPlayedVideo;
        }

        return null;
    };

    const checkPageVideo = async () => {
        state.pageVideo = await getOptimalPageVideo();
        if (!state.pageVideo) {
            log('未找到符合条件的视频');
            return false;
        }
        return true;
    };

    const isInputFocused = () => {
        const activeElement = document.activeElement;
        const inputTypes = ['input', 'textarea', 'select', 'button'];
        const isContentEditable = activeElement && activeElement.isContentEditable;
        const isInputElement = activeElement && inputTypes.includes(activeElement.tagName.toLowerCase());
        return isContentEditable || isInputElement;
    };

    const handleKeyboardEvents = async (enable) => {
        if (enable && !keyboardEventsRegistered) {
            document.body.addEventListener('keydown', onRightKeyDown, { capture: true });
            document.body.addEventListener('keydown', onLeftKeyDown, { capture: true });
            document.body.parentElement.addEventListener('keyup', onRightKeyUp, { capture: true });
            document.body.parentElement.addEventListener('keyup', onLeftKeyUp, { capture: true });
            keyboardEventsRegistered = true;
        } else if (!enable && keyboardEventsRegistered) {
            document.body.removeEventListener('keydown', onRightKeyDown, { capture: true });
            document.body.removeEventListener('keydown', onLeftKeyDown, { capture: true });
            document.body.parentElement.removeEventListener('keyup', onRightKeyUp, { capture: true });
            document.body.parentElement.removeEventListener('keyup', onLeftKeyUp, { capture: true });
            keyboardEventsRegistered = false;
        }
    };

    const onRightKeyDown = async (e) => {
        if (e.keyCode !== 39 || isInputFocused()) return;
        e.preventDefault();
        e.stopPropagation();
        state.downCount++;
        if (state.downCount === 2 && await checkPageVideo()) {
            if (isVideoPlaying(state.pageVideo)) {
                state.originalPlaybackRate = state.pageVideo.playbackRate;
                state.pageVideo.playbackRate = state.playbackRate;
                log('加速播放中, 倍速: ' + state.playbackRate);
            }
        }
    };

    const onRightKeyUp = async (e) => {
        if (e.keyCode !== 39 || isInputFocused()) return;
        e.preventDefault();
        e.stopPropagation();
        if (state.downCount === 1 && await checkPageVideo()) {
            state.pageVideo.currentTime += state.changeTime;
            log('前进 ' + state.changeTime + ' 秒');
        }

        if (state.pageVideo && state.pageVideo.playbackRate !== state.originalPlaybackRate) {
            state.pageVideo.playbackRate = state.originalPlaybackRate;
            log('恢复原来的倍速: ' + state.originalPlaybackRate);
        }

        state.downCount = 0;
    };

    const onLeftKeyDown = async (e) => {
        if (e.keyCode !== 37 || isInputFocused()) return;
        e.preventDefault();
        e.stopPropagation();
        state.downCount++;
        if (state.downCount === 2 && await checkPageVideo()) {
            if (isVideoPlaying(state.pageVideo)) {
                state.originalPlaybackRate = state.pageVideo.playbackRate;
                state.pageVideo.playbackRate = 1 / state.playbackRate;
                log('减速播放中, 倍速: ' + state.pageVideo.playbackRate);
            }
        }
    };

    const onLeftKeyUp = async (e) => {
        if (e.keyCode !== 37 || isInputFocused()) return;
        e.preventDefault();
        e.stopPropagation();
        if (state.downCount === 1 && await checkPageVideo()) {
            state.pageVideo.currentTime -= state.changeTime;
            log('回退 ' + state.changeTime + ' 秒');
        }

        if (state.pageVideo && state.pageVideo.playbackRate !== state.originalPlaybackRate) {
            state.pageVideo.playbackRate = state.originalPlaybackRate;
            log('恢复原来的倍速: ' + state.originalPlaybackRate);
        }

        state.downCount = 0;
    };

    const configurePlaybackRate = async () => {
        const newRate = prompt('请输入新的播放倍速 (当前: ' + state.playbackRate + ')', state.playbackRate);
        if (newRate !== null) {
            const parsedRate = parseFloat(newRate);
            if (!isNaN(parsedRate) && parsedRate > 0) {
                state.playbackRate = parsedRate;
                await saveSetting('playbackRate', state.playbackRate);
                log('播放倍速设置为: ' + state.playbackRate);
            }
        }
    };

    const configureChangeTime = async () => {
        const newTime = prompt('请输入新的快进/回退秒数 (当前: ' + state.changeTime + ')', state.changeTime);
        if (newTime !== null) {
            const parsedTime = parseFloat(newTime);
            if (!isNaN(parsedTime) && parsedTime > 0) {
                state.changeTime = parsedTime;
                await saveSetting('changeTime', state.changeTime);
                log('快进/回退秒数设置为: ' + state.changeTime);
            }
        }
    };

    const init = async () => {
        const isBlocked = await isDomainBlocked();
        handleKeyboardEvents(!isBlocked);

        GM_registerMenuCommand('启用/禁用黄金左右键', toggleCurrentDomain);
        GM_registerMenuCommand('设置播放倍速', configurePlaybackRate);
        GM_registerMenuCommand('设置快进/回退秒数', configureChangeTime);

        initVideoListeners();

        const observer = new MutationObserver((mutations) => {
            const hasVideoChanges = mutations.some(mutation => Array.from(mutation.addedNodes).some(node => node.tagName === 'VIDEO'));
            if (hasVideoChanges) {
                initVideoListeners(); // 仅在检测到视频节点变化时才初始化监听器
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    init();
})();
