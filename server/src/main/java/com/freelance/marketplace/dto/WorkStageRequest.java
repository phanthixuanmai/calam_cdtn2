package com.freelance.marketplace.dto;

import com.freelance.marketplace.entity.WorkStage;
import jakarta.validation.constraints.NotNull;

public record WorkStageRequest(@NotNull(message = "Vui lòng chọn giai đoạn công việc") WorkStage stage) {
}
