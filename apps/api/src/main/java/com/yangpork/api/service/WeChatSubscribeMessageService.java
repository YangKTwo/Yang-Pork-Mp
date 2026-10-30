package com.yangpork.api.service;

import com.yangpork.api.config.AppProperties;
import com.yangpork.api.domain.OrderEntity;
import com.yangpork.api.domain.UserEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * WeChat mini-program subscribe message (prepared notification).
 */
@Service
public class WeChatSubscribeMessageService {
    private static final Logger log = LoggerFactory.getLogger(WeChatSubscribeMessageService.class);

    private final AppProperties props;
    private final RestClient restClient = RestClient.create();

    public WeChatSubscribeMessageService(AppProperties props) {
        this.props = props;
    }

    /**
     * @throws RuntimeException when real-mode send fails (caller marks FAILED, does not fail order transition)
     */
    public void sendPreparedNotice(UserEntity user, OrderEntity order, String templateId) {
        if (props.getWx().isMockMode()) {
            log.info("[mock wx] subscribe prepared: openid={}, orderId={}, templateId={}, pickupDate={}, slot={}",
                    user.getOpenid(), order.getId(), templateId, order.getPickupDate(), order.getPickupSlot());
            return;
        }
        AppProperties.Wx wx = props.getWx();
        if (!StringUtils.hasText(wx.getAppId()) || !StringUtils.hasText(wx.getAppSecret())) {
            throw new IllegalStateException("微信未配置 appId/appSecret");
        }
        String accessToken = fetchAccessToken(wx.getAppId(), wx.getAppSecret());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("touser", user.getOpenid());
        body.put("template_id", templateId);
        body.put("page", "pages/order/detail?id=" + order.getId());
        body.put("miniprogram_state", "formal");
        body.put("lang", "zh_CN");
        body.put("data", buildTemplateData(order));

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restClient.post()
                .uri("https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + accessToken)
                .body(body)
                .retrieve()
                .body(Map.class);
        if (resp == null) {
            throw new IllegalStateException("empty response from WeChat subscribe send");
        }
        Object errcode = resp.get("errcode");
        if (errcode != null && !"0".equals(String.valueOf(errcode)) && !Integer.valueOf(0).equals(errcode)) {
            throw new IllegalStateException("WeChat errcode=" + errcode + " errmsg=" + resp.get("errmsg"));
        }
        log.info("subscribe prepared sent: orderId={}, openid={}", order.getId(), user.getOpenid());
    }

    private Map<String, Object> buildTemplateData(OrderEntity order) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("thing1", Map.of("value", truncate(order.getCustomerRealName(), 20)));
        data.put("date2", Map.of("value", order.getPickupDate().toString()));
        String slotLabel = order.getPickupSlot() == null ? "" : order.getPickupSlot().name();
        data.put("thing3", Map.of("value", truncate(slotLabel, 20)));
        return data;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    @SuppressWarnings("unchecked")
    private String fetchAccessToken(String appId, String appSecret) {
        Map<String, Object> resp = restClient.get()
                .uri("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={secret}",
                        appId, appSecret)
                .retrieve()
                .body(Map.class);
        if (resp == null || resp.get("access_token") == null) {
            throw new IllegalStateException("failed to get access_token: " + resp);
        }
        return String.valueOf(resp.get("access_token"));
    }
}
