package com.yangpork.api.service;

import com.yangpork.api.common.BizException;
import com.yangpork.api.common.ErrorCodes;
import com.yangpork.api.config.AppProperties;
import com.yangpork.api.domain.Role;
import com.yangpork.api.domain.UserEntity;
import com.yangpork.api.repo.UserRepository;
import com.yangpork.api.security.AuthUser;
import com.yangpork.api.security.JwtService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final IdGenerator idGenerator;
    private final AppProperties props;
    private final WeChatSessionService weChatSessionService;

    public AuthService(UserRepository userRepository, JwtService jwtService,
                       IdGenerator idGenerator, AppProperties props,
                       WeChatSessionService weChatSessionService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.idGenerator = idGenerator;
        this.props = props;
        this.weChatSessionService = weChatSessionService;
    }

    @Transactional
    public Map<String, Object> wxLogin(String code, String devKey, String mockOpenid, String headerDevKey) {
        String openid = resolveOpenid(code, devKey, mockOpenid, headerDevKey);
        UserEntity user = userRepository.findByOpenid(openid).orElseGet(() -> {
            UserEntity u = new UserEntity();
            u.setId(idGenerator.userId());
            u.setOpenid(openid);
            u.setRole(Role.CUSTOMER);
            return userRepository.save(u);
        });
        String token = jwtService.issue(user.getId(), user.getRole());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", token);
        data.put("expiresIn", jwtService.expiresInSec());
        data.put("profileCompleted", user.isProfileCompleted());
        data.put("user", toUserView(user));
        return data;
    }

    private String resolveOpenid(String code, String devKey, String mockOpenid, String headerDevKey) {
        AppProperties.Wx wx = props.getWx();
        if (wx.isRealMode()) {
            return weChatSessionService.openidFromCode(code);
        }
        if (!wx.isMockMode()) {
            throw new BizException(ErrorCodes.BAD_PARAM,
                    "app.wx.mode 无效，仅支持 mock 或 real，当前: " + wx.getMode());
        }
        String stableRaw = firstNonBlank(devKey, mockOpenid, headerDevKey);
        if (!StringUtils.hasText(stableRaw)) {
            throw new BizException(ErrorCodes.BAD_PARAM,
                    "mock 登录须传稳定身份键：请求体 devKey（或 mockOpenid），或 Header X-Dev-Key；勿依赖每次变化的 wx.login code");
        }
        String normalized = DevKeyNormalizer.normalize(stableRaw);
        if (!StringUtils.hasText(normalized)) {
            throw new BizException(ErrorCodes.BAD_PARAM,
                    "devKey 规范化后为空，请使用字母、数字及 . _ -");
        }
        return "mock_dev_" + normalized;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) {
                return v;
            }
        }
        return null;
    }

    @Transactional
    public Map<String, Object> updateProfile(AuthUser auth, String realName, String phone) {
        if (!StringUtils.hasText(realName) || !StringUtils.hasText(phone)) {
            throw new BizException(ErrorCodes.BAD_PARAM, "姓名和手机必填");
        }
        UserEntity user = userRepository.findById(auth.userId())
                .orElseThrow(() -> new BizException(ErrorCodes.NOT_FOUND, "用户不存在"));
        user.setRealName(realName.trim());
        user.setPhone(phone.trim());
        user.setNickname(realName.trim() + phone.trim());
        user.setProfileCompleted(true);
        user.setRole(resolveRole(phone.trim()));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        String token = jwtService.issue(user.getId(), user.getRole());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", token);
        data.put("expiresIn", jwtService.expiresInSec());
        data.put("profileCompleted", true);
        data.put("user", toUserView(user));
        return data;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> me(AuthUser auth) {
        UserEntity user = userRepository.findById(auth.userId())
                .orElseThrow(() -> new BizException(ErrorCodes.NOT_FOUND, "用户不存在"));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("profileCompleted", user.isProfileCompleted());
        data.put("user", toUserView(user));
        return data;
    }

    public UserEntity requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BizException(ErrorCodes.NOT_FOUND, "用户不存在"));
    }

    private Role resolveRole(String phone) {
        if (props.getRoles().getAdminPhones().contains(phone)) return Role.ADMIN;
        if (props.getRoles().getShopPhones().contains(phone)) return Role.SHOP;
        return Role.CUSTOMER;
    }

    private Map<String, Object> toUserView(UserEntity u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("role", u.getRole().name());
        m.put("nickname", u.getNickname());
        m.put("phone", u.getPhone());
        m.put("realName", u.getRealName());
        return m;
    }
}
