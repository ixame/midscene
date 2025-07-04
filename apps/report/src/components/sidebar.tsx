import './sidebar.less';
import { useAllCurrentTasks, useExecutionDump } from '@/components/store';
import { MessageOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { ExecutionTask, ExecutionTaskInsightLocate } from '@midscene/core';
import { iconForStatus, timeCostStrElement } from '@midscene/visualizer';
import { typeStr } from '@midscene/web/ui-utils';
import { useEffect } from 'react';
import PanelTitle from './panel-title';

const SideItem = (props: {
  task: ExecutionTask;
  selected?: boolean;
  onClick?: () => void;
  onItemHover?: (task: ExecutionTask | null, x?: number, y?: number) => any;
}): JSX.Element => {
  const { task, onClick, selected } = props;

  const selectedClass = selected ? 'selected' : '';
  let statusText: JSX.Element | string = task.status;

  const cacheEl = task.hitBy?.from === 'Cache' ? <span>(cache) </span> : null;

  const deepThinkEl = (task as ExecutionTaskInsightLocate)?.log?.dump
    ?.deepThink ? (
    <span>(deep think) </span>
  ) : null;

  if (task.timing?.cost) {
    statusText = timeCostStrElement(task.timing.cost);
  }

  const statusIcon =
    task.status === 'finished' && task.error
      ? iconForStatus('finishedWithWarning')
      : iconForStatus(task.status);

  const titleTextIcon =
    task.type === 'Planning' ? (
      <span style={{ display: 'inline-block', marginLeft: '4px' }}>
        <VideoCameraOutlined />
      </span>
    ) : null;

  return (
    <div
      className={`side-item ${selectedClass}`}
      onClick={onClick}
      // collect x,y (refer to the body) for hover preview
      onMouseEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width;
        const y = rect.top;
        props.onItemHover?.(task, x, y);
      }}
      onMouseLeave={() => {
        props.onItemHover?.(null);
      }}
    >
      {' '}
      <div className={'side-item-name'}>
        <span className="status-icon">{statusIcon}</span>
        <div className="title">
          {typeStr(task)} {titleTextIcon}
        </div>
        <div className="status-text">
          {cacheEl}
          {deepThinkEl}
          {statusText}
        </div>
      </div>
    </div>
  );
};

const Sidebar = (): JSX.Element => {
  const sdkVersion = useExecutionDump((store) => store.sdkVersion);
  const modelName = useExecutionDump((store) => store.modelName);
  const modelDescription = useExecutionDump((store) => store.modelDescription);
  const groupedDump = useExecutionDump((store) => store.dump);
  const setActiveTask = useExecutionDump((store) => store.setActiveTask);
  const activeTask = useExecutionDump((store) => store.activeTask);
  const setHoverTask = useExecutionDump((store) => store.setHoverTask);
  const setHoverPreviewConfig = useExecutionDump(
    (store) => store.setHoverPreviewConfig,
  );
  // const selectedTaskIndex = useExecutionDump((store) => store.selectedTaskIndex);
  // const setSelectedTaskIndex = useExecutionDump((store) => store.setSelectedTaskIndex);
  const reset = useExecutionDump((store) => store.reset);

  const allTasks = useAllCurrentTasks();
  const currentSelectedIndex = allTasks?.findIndex(
    (task) => task === activeTask,
  );

  useEffect(() => {
    // all tasks
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!allTasks?.length || allTasks?.length <= 1) {
        return;
      }
      // should be command / ctrl + arrow
      if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const nextIndex = currentSelectedIndex - 1;
        if (nextIndex < 0) {
          return;
        }
        const nextTask = allTasks[nextIndex];
        setActiveTask(nextTask);
      } else if (e.key === 'ArrowDown' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const nextIndex = currentSelectedIndex + 1;
        if (nextIndex >= allTasks.length) {
          return;
        }
        const nextTask = allTasks[nextIndex];
        setActiveTask(nextTask);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSelectedIndex, allTasks, setActiveTask]);

  const modelDescriptionText = modelDescription ? `, ${modelDescription}` : '';
  const envInfo = sdkVersion
    ? `v${sdkVersion}, ${modelName || 'default model'}${modelDescriptionText}`
    : '';

  const sideList = groupedDump ? (
    [groupedDump].map((group, groupIndex) => {
      const executions = group.executions.map((execution, indexOfExecution) => {
        const { tasks } = execution;
        const taskList = tasks.map((task, index) => {
          return (
            <SideItem
              key={index}
              task={task}
              selected={task === activeTask}
              onClick={() => {
                setActiveTask(task);
              }}
              onItemHover={(hoverTask, x, y) => {
                if (hoverTask && x && y) {
                  setHoverPreviewConfig({ x, y });
                  setHoverTask(hoverTask);
                } else {
                  setHoverPreviewConfig(null);
                  setHoverTask(null);
                }
              }}
            />
          );
        });
        let seperator: JSX.Element;
        switch (indexOfExecution) {
          case 0:
            seperator = (
              <div className="side-seperator side-seperator-space-up" />
            );
            break;
          default:
            seperator = (
              <div className="side-seperator side-seperator-space-up side-seperator-space-down" />
            );
            break;
        }
        return (
          <div key={indexOfExecution}>
            {seperator}
            <div className="side-sub-title">
              <span className="name-status">
                <MessageOutlined />
              </span>
              {execution.name}
            </div>
            {taskList}
          </div>
        );
      });
      return (
        <div key={groupIndex}>
          <PanelTitle title={group.groupName} subTitle={envInfo} />
          {executions}
        </div>
      );
    })
  ) : (
    <span>no tasks</span>
  );

  return (
    <div className="side-bar">
      <div className="top-controls">
        <div className="task-list">{sideList}</div>
        <div className="side-seperator side-seperator-line side-seperator-space-up" />
        <div className="task-meta-section">
          <div className="task-meta">switch: Command + Up / Down</div>
        </div>
      </div>
      <div className="bottom-controls">
        {/* <Button onClick={reset} type="text" className="unload_btn">
          Unload
        </Button> */}
      </div>
    </div>
  );
};

export default Sidebar;
