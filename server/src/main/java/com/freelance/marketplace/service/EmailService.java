package com.freelance.marketplace.service;

import com.freelance.marketplace.entity.EmployerProfile;
import com.freelance.marketplace.entity.Job;
import com.freelance.marketplace.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public EmailService(JavaMailSender mailSender, @Value("${spring.mail.username:}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    /**
     * Gui email thong bao ung vien duoc nhan. Chay bat dong bo va khong bao gio nem loi,
     * de loi gui mail khong lam hong thao tac nhan ung vien.
     */
    @Async
    public void sendApplicationAccepted(User student, Job job) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Chua cau hinh MAIL_USERNAME/MAIL_PASSWORD, bo qua gui email cho ung vien");
            return;
        }
        if (student == null || student.getEmail() == null || student.getEmail().isBlank()) {
            log.warn("Ung vien khong co email, bo qua gui email");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(student.getEmail());
            message.setSubject("Bạn đã được nhận vào công việc: " + job.getTitle());
            message.setText(buildBody(student, job));
            mailSender.send(message);
            log.info("Da gui email chap nhan toi {}", student.getEmail());
        } catch (Exception ex) {
            log.error("Khong gui duoc email toi {}: {}", student.getEmail(), ex.getMessage());
        }
    }

    private String buildBody(User student, Job job) {
        User employer = job.getEmployer();
        EmployerProfile profile = employer != null ? employer.getEmployerProfile() : null;
        String company = profile != null && profile.getCompanyName() != null && !profile.getCompanyName().isBlank()
                ? profile.getCompanyName()
                : employer != null ? employer.getName() : "Nhà tuyển dụng";

        StringBuilder body = new StringBuilder();
        body.append("Xin chào ").append(student.getName()).append(",\n\n");
        body.append("Chúc mừng! ").append(company).append(" đã chấp nhận đơn ứng tuyển của bạn cho công việc \"")
                .append(job.getTitle()).append("\".\n\n");
        body.append("Thông tin công việc:\n");
        appendLine(body, "- Địa điểm", job.getLocation());
        appendLine(body, "- Mức lương", job.getSalaryRange());
        appendLine(body, "- Lịch làm việc", job.getWorkSchedule());
        if (employer != null) {
            body.append("\nLiên hệ nhà tuyển dụng:\n");
            appendLine(body, "- Người liên hệ", employer.getName());
            appendLine(body, "- Email", employer.getEmail());
            appendLine(body, "- Số điện thoại", employer.getPhone());
        }
        body.append("\nVui lòng đăng nhập Ca Làm để xem chi tiết và theo dõi tiến độ công việc.\n\nTrân trọng,\nCa Làm");
        return body.toString();
    }

    private void appendLine(StringBuilder body, String label, String value) {
        if (value != null && !value.isBlank()) {
            body.append(label).append(": ").append(value).append("\n");
        }
    }
}