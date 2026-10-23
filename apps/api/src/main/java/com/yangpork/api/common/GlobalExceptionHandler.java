package com.yangpork.api.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> handleBiz(BizException e) {
        HttpStatus status = HttpStatus.OK;
        if (e.getCode() == ErrorCodes.UNAUTH) status = HttpStatus.UNAUTHORIZED;
        else if (e.getCode() == ErrorCodes.FORBIDDEN) status = HttpStatus.FORBIDDEN;
        else if (e.getCode() == ErrorCodes.NOT_FOUND) status = HttpStatus.NOT_FOUND;
        return ResponseEntity.status(status).body(ApiResponse.fail(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .orElse("参数非法");
        return ResponseEntity.ok(ApiResponse.fail(ErrorCodes.BAD_PARAM, msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.fail(50000, e.getMessage() == null ? "internal error" : e.getMessage()));
    }
}
