package com.privacydashboard.application;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactSpaController {

    @GetMapping({
            "/react",
            "/react/",
            "/react/{path:[^\\.]*}",
            "/react/{path1:[^\\.]*}/{path2:[^\\.]*}",
            "/react/{path1:[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}",
            "/react/{path1:[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}/{path4:[^\\.]*}",
            "/react/{path1:[^\\.]*}/{path2:[^\\.]*}/{path3:[^\\.]*}/{path4:[^\\.]*}/{path5:[^\\.]*}"
    })
    public String forwardReact() {
        return "forward:/react/index.html";
    }
}
