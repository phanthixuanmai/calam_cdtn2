package com.freelance.marketplace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AvailabilitySlotRequest(
        @NotBlank(message = "Vui lòng chọn ngày có thể làm việc") String day,
        @NotBlank(message = "Vui lòng chọn giờ bắt đầu")
        @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "Giờ bắt đầu không hợp lệ") String startTime,
        @NotBlank(message = "Vui lòng chọn giờ kết thúc")
        @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d", message = "Giờ kết thúc không hợp lệ") String endTime
) {
}
