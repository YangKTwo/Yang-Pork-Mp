package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * WeChat mini-program code2session (real mode). Not wired to HTTP in v0.1.
 */
@Service
public class WeChatSessionService {
    private final AppProperties props;

    public WeChatSessionService(AppProperties props) {
        this.props = props;
    }

    /**
     * Exchange wx.login code for openid. Requires app.wx.app-id and app.wx.app-secret.
     */
    public String openidFromCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BizException(ErrorCodes.BAD_PARAM, "code 必填");
        }
        AppProperties.Wx wx = props.getWx();
        if (!StringUtils.hasText(wx.getAppId()) || !StringUtils.hasText(wx.getAppSecret())) {
            throw new BizException(ErrorCodes.BAD_PARAM,
                    "微信登录未配置：请设置环境变量 WX_APP_ID 与 WX_APP_SECRET（app.wx.mode=real）");
        }
        // TODO: call https://api.weixin.qq.com/sns/jscode2session
        throw new BizException(ErrorCodes.BAD_PARAM, "微信 code2session 尚未实现，请暂时使用 app.wx.mode=mock");
    }
}
